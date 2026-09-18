import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { getStatusStyle } from '../statusBadge';
import '../styles/table.css';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend
} from 'recharts';

export default function Dashboard() {
  const [lowStock, setLowStock]         = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [kpis, setKpis]                 = useState(null);
  const [salesData, setSalesData]       = useState([]);
  const [topProducts, setTopProducts]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const user     = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ordersEndpoint = user.role === 'admin' ? '/orders' : '/orders/my';
      const [ordersRes] = await Promise.all([
        api.get(ordersEndpoint),
        user.role === 'admin'
          ? api.get('/reports/low-stock').then(r => setLowStock(r.data.products || [])).catch(() => {})
          : Promise.resolve(),
        user.role === 'admin'
          ? api.get('/reports/dashboard-kpis').then(r => setKpis(r.data)).catch(() => {})
          : Promise.resolve(),
        user.role === 'admin'
          ? api.get('/reports/sales').then(r => setSalesData(r.data.data || [])).catch(() => {})
          : Promise.resolve(),
        user.role === 'admin'
          ? api.get('/reports/top-products').then(r => setTopProducts(r.data.products || [])).catch(() => {})
          : Promise.resolve(),
      ]);
      setRecentOrders((ordersRes.data.orders || []).slice(0, 5));
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const kpiCards = kpis ? [
    { label: 'Orders Today',        value: kpis.ordersToday,           icon: '📦', color: '#8b5cf6' },
    { label: 'Revenue This Month',  value: `₹${Number(kpis.revenueThisMonth).toLocaleString()}`, icon: '💰', color: '#10b981' },
    { label: 'Pending Orders',      value: kpis.pendingOrders,         icon: '⏳', color: '#f59e0b' },
    { label: 'Low Stock Products',  value: kpis.lowStockProducts,      icon: '⚠️', color: '#ef4444' },
    { label: 'New Customers',       value: kpis.newCustomersThisMonth, icon: '👤', color: '#3b82f6' },
  ] : [];

  return (
    <div>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ marginBottom: '4px' }}>
              👋 Welcome back{user.name ? `, ${user.name}` : ''}!
            </h2>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>
              Here's what's happening with your inventory today.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {loading && (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>⏳ Loading…</span>
            )}
            <button className="btn btn-outline" onClick={loadDashboard} disabled={loading}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {/* ── KPI Cards (admin only) ── */}
        {user.role === 'admin' && kpis && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}>
            {kpiCards.map(card => (
              <div key={card.label} style={{
                background: 'rgba(17, 24, 39, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
                onMouseEnter={e => { 
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; 
                  e.currentTarget.style.boxShadow = `0 20px 40px -10px rgba(0,0,0,0.7), 0 0 20px ${card.color}33, inset 0 1px 0 rgba(255, 255, 255, 0.1)`; 
                  e.currentTarget.style.borderColor = `${card.color}66`;
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.transform = ''; 
                  e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'; 
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: `radial-gradient(circle, ${card.color}22 0%, transparent 70%)`, filter: 'blur(10px)', zIndex: 0 }}></div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>{card.icon}</span>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: card.color, lineHeight: 1, textShadow: `0 0 15px ${card.color}44` }}>
                    {card.value}
                  </span>
                </div>
                <span style={{ position: 'relative', zIndex: 1, fontSize: '13px', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {card.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Charts Section (admin only) ── */}
        {user.role === 'admin' && (salesData.length > 0 || topProducts.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {salesData.length > 0 && (
              <div className="form-box" style={{ padding: '24px' }}>
                <h4 style={{ marginBottom: '16px' }}>📈 Revenue Over Time</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={salesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="period" tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                      formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {topProducts.length > 0 && (
              <div className="form-box" style={{ padding: '24px' }}>
                <h4 style={{ marginBottom: '16px' }}>🏆 Top Products by Revenue</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProducts.slice(0, 5)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-light)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                      formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        <div className="link-row" style={{ display: 'flex', gap: '10px' }}>
          <Link to="/products" className="btn">🏷️ Products</Link>
          <Link to="/categories" className="btn">📁 Categories</Link>
          <Link to="/orders" className="btn">📋 Orders</Link>
          {user.role === 'admin' && <Link to="/reports" className="btn">📊 Reports</Link>}
          {user.role === 'admin' && <Link to="/audit-logs" className="btn">🔍 Audit Logs</Link>}
        </div>

        {user.role === 'admin' && lowStock.length > 0 && (
          <div>
            <h3>⚠️ Low Stock ({lowStock.length})</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td><code style={{ background: 'rgba(243,244,246,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{p.sku}</code></td>
                    <td style={{ color: '#ef4444', fontWeight: 700 }}>{p.stock_quantity}</td>
                    <td style={{ color: 'var(--text-light)' }}>{p.low_stock_threshold}</td>
                    <td>
                      <Link to="/products" className="btn-sm">Restock →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3>🕑 Recent Orders</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td data-label="#" style={{ fontWeight: 600 }}>#{o.id}</td>
                    <td data-label="Status">
                      <span style={getStatusStyle(o.status)}>
                        {o.status}
                      </span>
                    </td>
                    <td data-label="Total" style={{ fontWeight: 500 }}>₹{Number(o.total_amount).toFixed(2)}</td>
                    <td data-label="Date" style={{ color: 'var(--text-light)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && recentOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-light)', marginTop: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
            <p>No orders yet. <Link to="/orders" style={{ color: 'var(--primary-light)' }}>Place your first order →</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
