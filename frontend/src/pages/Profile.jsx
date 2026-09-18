import { useState, useEffect } from 'react';
import api from '../api';
import '../styles/auth.css';
import '../styles/table.css';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
  }, [success]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [meRes, ordersRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/orders/my')
        ]);
        setUser(meRes.data);
        setOrders(ordersRes.data.orders || []);
      } catch (err) {
        setError('Failed to load profile data.');
      }
    };
    fetchProfile();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/change-password', passwords);
      setSuccess('Password changed successfully.');
      setPasswords({ old_password: '', new_password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="container">Loading profile...</div>;

  return (
    <div className="container">
      <h2 style={{ marginBottom: '24px' }}>User Profile</h2>
      
      {error && <p className="error">{error}</p>}
      {success && <p className="success-toast">{success}</p>}

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        
        {/* Profile Info & Password Change */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div className="form-box">
            <h4>Profile Information</h4>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '12px' }}>Name</span>
              <strong>{user.name}</strong>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '12px' }}>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '12px' }}>Role</span>
              <span style={{ background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                {user.role}
              </span>
            </div>
          </div>

          <div className="form-box">
            <h4>Change Password</h4>
            <form onSubmit={handlePasswordChange}>
              <input
                className="input"
                type="password"
                placeholder="Current Password"
                required
                value={passwords.old_password}
                onChange={e => setPasswords({ ...passwords, old_password: e.target.value })}
              />
              <input
                className="input"
                type="password"
                placeholder="New Password"
                required
                minLength="6"
                value={passwords.new_password}
                onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
              />
              <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Order History */}
        <div style={{ flex: 2, minWidth: '350px' }}>
          <div className="form-box" style={{ padding: '24px 0' }}>
            <h4 style={{ padding: '0 24px' }}>Recent Order History</h4>
            {orders.length === 0 ? (
              <p style={{ padding: '0 24px', color: 'var(--text-light)' }}>You haven't placed any orders yet.</p>
            ) : (
              <table className="table" style={{ margin: 0, boxShadow: 'none', border: 'none', borderTop: '1px solid var(--border)' }}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td data-label="Order ID">#{order.id}</td>
                      <td data-label="Date">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td data-label="Status">
                        <span className={`badge badge-${order.status}`}>{order.status}</span>
                      </td>
                      <td data-label="Total">₹{Number(order.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
