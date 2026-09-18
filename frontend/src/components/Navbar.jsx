import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <span>📦 Inventory Manager</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/products">Products</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/orders">Orders</Link>
        {user.role === 'admin' && <Link to="/reports">Reports</Link>}
        {user.role === 'admin' && <Link to="/audit-logs">Audit Logs</Link>}

        <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          🛒 Cart
          {totalItems > 0 && (
            <span style={{
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              {totalItems}
            </span>
          )}
        </Link>
        
        <button 
          onClick={toggleTheme} 
          style={{ background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <Link to="/profile" style={{ color: 'var(--text-light)', fontSize: '13px' }}>
          👤 {user.name} ({user.role})
        </Link>

        <button onClick={logout} className="btn-sm" style={{ marginLeft: '8px' }}>Logout</button>
      </div>
    </nav>
  );
}
