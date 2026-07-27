const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { getAllOrders, getOrderById, createOrder, updateOrderStatus, isValidTransition } = require('../models/Order');
const { getProductById } = require('../models/Product');
const { writeAuditLog } = require('../models/StockAuditLog');
const PDFDocument = require('pdfkit');

// ── Validation ─────────────────────────────────────────────────────────────────

const orderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.product_id')
    .isInt({ min: 1 })
    .withMessage('Valid product_id required'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be a positive integer (max 1000 per item'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be 500 characters or fewer'),
  body('shipping_address')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Shipping address must be 1000 characters or fewer'),
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Detect duplicate product IDs in the order items array.
 * Prevents users from submitting quantity splits for the same product.
 */
const hasDuplicateProducts = (items) => {
  const ids = items.map(i => i.product_id);
  return ids.length !== new Set(ids).size;
};

// ── Controllers ────────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const user_id = req.user.role === 'admin' ? null : req.user.id;
    const result = await getAllOrders({ status, user_id, page, limit });
    res.json(result); // now includes { orders, total, page, limit, totalPages }
  } catch (err) {
    console.error('Order Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const result = await getAllOrders({ user_id: req.user.id, page, limit, status });
    res.json(result);
  } catch (err) {
    console.error('Order Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    res.json({ order });
  } catch (err) {
    console.error('Order Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const placeOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Guard against duplicate product entries in a single order
  if (hasDuplicateProducts(req.body.items)) {
    return res.status(400).json({
      message: 'Duplicate product IDs in order items. Combine quantities for the same product.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const enrichedItems = [];

    for (const item of req.body.items) {
      const product = await getProductById(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.stock_quantity < item.quantity)
        throw new Error(
          `Insufficient stock for "${product.name}" — requested ${item.quantity}, available ${product.stock_quantity}`
        );

      // Pessimistic lock: re-check stock inside transaction to prevent race conditions
      const stockResult = await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2 AND stock_quantity >= $1 AND deleted_at IS NULL RETURNING *`,
        [item.quantity, item.product_id]
      );
      if (stockResult.rowCount === 0)
        throw new Error(`Stock conflict for "${product.name}" — please try again`);

      await writeAuditLog(client, {
        product_id: product.id,
        changed_by: req.user.id,
        quantity_before: product.stock_quantity,
        quantity_after: stockResult.rows[0].stock_quantity,
        reason: 'order_placed',
      });

      enrichedItems.push({ ...item, unit_price: product.price });
    }

    const order = await createOrder(client, {
      user_id: req.user.id,
      items: enrichedItems,
      notes: req.body.notes,
      shipping_address: req.body.shipping_address,
    });

    await client.query('COMMIT');
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status is required' });

  // Allow non-admin users to cancel only their own pending/confirmed orders
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && status !== 'cancelled') {
    return res.status(403).json({ message: 'Only admins can advance order status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const order = await getOrderById(req.params.id);
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }

    // Non-admins can only cancel their own orders
    if (!isAdmin && order.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'You can only cancel your own orders' });
    }

    if (!isValidTransition(order.status, status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot transition from "${order.status}" to "${status}"`,
        allowedNext:
          status === 'cancelled'
            ? 'Cancellation only allowed from pending or confirmed'
            : `Expected next status after "${order.status}"`,
      });
    }

    // On cancellation: restore stock for every line item atomically
    if (status === 'cancelled') {
      for (const item of order.items) {
        // Re-fetch current stock so the audit log reflects the live quantity
        const currentProduct = await getProductById(item.product_id);
        const restored = await client.query(
          `UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW()
           WHERE id = $2 RETURNING *`,
          [item.quantity, item.product_id]
        );
        if (restored.rowCount === 0) {
          // Product was hard-deleted — log the orphan but don't fail the cancellation
          console.warn(`[cancelOrder] Product ${item.product_id} not found during stock restore`);
          continue;
        }
        await writeAuditLog(client, {
          product_id: item.product_id,
          changed_by: req.user.id,
          quantity_before: currentProduct?.stock_quantity ?? item.quantity,
          quantity_after: restored.rows[0].stock_quantity,
          reason: 'order_cancelled',
        });
      }
    }

    const updated = await updateOrderStatus(req.params.id, status);
    await client.query('COMMIT');
    res.json({ message: `Order status updated to "${status}"`, order: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
};

/**
 * GET /api/v1/orders/:id/items
 * Returns only the line-items for a given order.
 * Admins see any order; customers may only query their own.
 */
const getOrderItems = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    res.json({ order_id: order.id, items: order.items });
  } catch (err) {
    console.error('Order Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getInvoice = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    const doc = new PDFDocument({ margin: 50 });
    const filename = `invoice-${order.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('Inventory & Order Management', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Invoice #${order.id}`);
    doc.fontSize(12).text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.text(`Customer: ${order.customer_name} (${order.customer_email})`);
    if (order.shipping_address) {
      doc.moveDown();
      doc.text(`Shipping Address:\n${order.shipping_address}`);
    }
    
    doc.moveDown(2);
    
    doc.fontSize(12)
       .text('Product', 50, doc.y, { continued: true, width: 200 })
       .text('SKU', 250, doc.y, { continued: true, width: 100 })
       .text('Qty', 350, doc.y, { continued: true, width: 50 })
       .text('Price', 400, doc.y, { continued: true, width: 50 })
       .text('Total', 450, doc.y);
       
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
    doc.moveDown(0.5);

    let currentY = doc.y;
    for (const item of order.items) {
      doc.text(item.product_name || 'Item', 50, currentY, { width: 190 });
      doc.text(item.sku || 'N/A', 250, currentY, { width: 90 });
      doc.text(item.quantity.toString(), 350, currentY, { width: 40 });
      doc.text(Number(item.unit_price).toFixed(2), 400, currentY, { width: 40 });
      doc.text((Number(item.quantity) * Number(item.unit_price)).toFixed(2), 450, currentY);
      currentY = doc.y + 10;
    }
    
    doc.y = currentY;
    doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
    doc.moveDown(1);
    
    doc.fontSize(14).text(`Order Total: Rs ${Number(order.total_amount).toFixed(2)}`, { align: 'right' });
    doc.end();

  } catch (err) {
    console.error('Invoice Error:', err);
    res.status(500).json({ message: 'Server error generating invoice', error: err.message });
  }
};

module.exports = { getAll, getMyOrders, getOne, getOrderItems, placeOrder, updateStatus, orderValidation, getInvoice };
