import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, totalPrice, totalItems } = useCart();
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const items = cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }));
      await api.post('/orders', { items, shipping_address: shippingAddress, notes });
      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>Your Cart is Empty 🛒</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>Looks like you haven't added anything yet.</p>
        <Link to="/products" className="btn">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 style={{ marginBottom: '20px' }}>Shopping Cart</h2>
      {error && <p className="error">{error}</p>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.product_id}>
                  <td data-label="Product"><strong>{item.name}</strong></td>
                  <td data-label="Price">₹{Number(item.price).toFixed(2)}</td>
                  <td data-label="Quantity">
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, Number(e.target.value))}
                      style={{ width: '70px', marginBottom: 0, padding: '6px 8px' }}
                    />
                  </td>
                  <td data-label="Total">₹{(item.price * item.quantity).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-sm btn-danger" onClick={() => removeFromCart(item.product_id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-box" style={{ marginTop: '20px' }}>
          <h4>Order Summary</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-light)' }}>
            <span>Total Items:</span>
            <span>{totalItems}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '18px', fontWeight: 'bold' }}>
            <span>Total Price:</span>
            <span>₹{totalPrice.toFixed(2)}</span>
          </div>
          
          <form onSubmit={handleCheckout}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-light)' }}>Shipping Address (Optional)</label>
            <textarea
              className="input"
              rows="3"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="123 Main St, Mumbai 400001"
            />
            
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-light)' }}>Order Notes (Optional)</label>
            <input
              className="input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Leave at door"
            />
            
            <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: '12px' }}>
              {loading ? 'Processing...' : 'Checkout & Place Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
