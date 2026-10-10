import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/table.css";
import "../styles/badges.css";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart,
} from "recharts";

const KPI_DEFS = [
  { key: "ordersToday",           label: "Orders Today",         icon: "📦", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", fmt: (v) => v },
  { key: "revenueThisMonth",      label: "Revenue This Month",   icon: "💰", color: "#CFA85C", bg: "#FBF6EB", border: "#EAD7AC", fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { key: "pendingOrders",         label: "Pending Orders",       icon: "⏳", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", fmt: (v) => v },
  { key: "lowStockProducts",      label: "Low Stock",            icon: "⚠️", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", fmt: (v) => v },
  { key: "newCustomersThisMonth", label: "New Customers",        icon: "👤", color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE", fmt: (v) => v },
];

const QUICK_LINKS = [
  { to: "/products",   label: "Products",   icon: "📦", desc: "Manage inventory & stock" },
  { to: "/categories", label: "Categories", icon: "🏷️", desc: "Organise product groups" },
  { to: "/orders",     label: "Orders",     icon: "📋", desc: "View & fulfil orders" },
  { to: "/cart",       label: "Cart",       icon: "🛒", desc: "Add items & checkout" },
];

const ADMIN_LINKS = [
  { to: "/reports",    label: "Reports",    icon: "📊", desc: "Sales & revenue insights" },
  { to: "/audit-logs", label: "Audit Logs", icon: "🔍", desc: "Track all system changes" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const STATUS_COLORS = {
  pending: { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  confirmed: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  packed: { bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" },
  shipped: { bg: "#ECFEFF", color: "#155E75", border: "#A5F3FC" },
  delivered: { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  cancelled: { bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
};

const CustomTooltip = ({ active, payload, label, prefix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5DFD1", borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 13 }}>
      <p style={{ color: "#4A6B61", marginBottom: 4 }}>{label}</p>
      <p style={{ fontWeight: 700, color: "#0F3A2E" }}>{prefix}{typeof payload[0].value === "number" ? Number(payload[0].value).toLocaleString("en-IN") : payload[0].value}</p>
    </div>
  );
};

export default function Dashboard() {
  const [lowStock, setLowStock]         = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [kpis, setKpis]                 = useState(null);
  const [salesData, setSalesData]       = useState([]);
  const [topProducts, setTopProducts]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 5000); return () => clearTimeout(t); }
  }, [error]);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const ordersEndpoint = user.role === "admin" ? "/orders" : "/orders/my";
      const [ordersRes] = await Promise.all([
        api.get(ordersEndpoint),
        user.role === "admin" ? api.get("/reports/low-stock").then(r => setLowStock(r.data.products || [])).catch(() => {}) : Promise.resolve(),
        user.role === "admin" ? api.get("/reports/dashboard-kpis").then(r => setKpis(r.data)).catch(() => {}) : Promise.resolve(),
        user.role === "admin" ? api.get("/reports/sales").then(r => setSalesData(r.data.data || [])).catch(() => {}) : Promise.resolve(),
        user.role === "admin" ? api.get("/reports/top-products").then(r => setTopProducts(r.data.products || [])).catch(() => {}) : Promise.resolve(),
      ]);
      setRecentOrders((ordersRes.data.orders || []).slice(0, 6));
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const allLinks = user.role === "admin" ? [...QUICK_LINKS, ...ADMIN_LINKS] : QUICK_LINKS;

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>
            {getGreeting()}{user.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
          </h1>
          <p style={{ color: "var(--text-light)", fontSize: 14 }}>
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>
        <button
          className="btn-outline"
          onClick={loadDashboard}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? "⏳ Loading…" : "🔄 Refresh"}
        </button>
      </div>

      {error && <p className="error">⚠️ {error}</p>}

      {/* KPI Cards (admin) */}
      {user.role === "admin" && kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 28 }}>
          {KPI_DEFS.map(({ key, label, icon, color, bg, border, fmt }) => (
            <div
              key={key}
              className="card"
              style={{ padding: "18px 20px", borderColor: border, background: bg, cursor: "default" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color, background: "rgba(255,255,255,0.7)", border: `1px solid ${border}`, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {user.role}
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.03em", marginBottom: 4 }}>
                {fmt(kpis[key] ?? 0)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-light)" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts (admin) */}
      {user.role === "admin" && (salesData.length > 0 || topProducts.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20, marginBottom: 28 }}>
          {salesData.length > 0 && (
            <div className="card" style={{ padding: "20px 20px 12px" }}>
              <h4 style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>📈 Revenue Over Time</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={salesData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#CFA85C" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#CFA85C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F0E6" />
                  <XAxis dataKey="period" tick={{ fill: "#8D9E98", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8D9E98", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Area type="monotone" dataKey="revenue" stroke="#CFA85C" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: "#CFA85C", r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {topProducts.length > 0 && (
            <div className="card" style={{ padding: "20px 20px 12px" }}>
              <h4 style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>🏆 Top Products by Revenue</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProducts.slice(0, 5)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F0E6" />
                  <XAxis dataKey="name" tick={{ fill: "#8D9E98", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8D9E98", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip prefix="₹" />} />
                  <Bar dataKey="revenue" fill="#CFA85C" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Quick Links grid */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 14 }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {allLinks.map(({ to, label, icon, desc }) => (
            <Link
              key={to}
              to={to}
              style={{ textDecoration: "none" }}
            >
              <div
                className="card"
                style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 14, borderRadius: 12 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-border)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 2, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Low Stock (admin) */}
      {user.role === "admin" && lowStock.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, color: "#B91C1C" }}>⚠️ Low Stock Alert ({lowStock.length})</h3>
            <Link to="/products" className="btn-sm">View All →</Link>
          </div>
          <table className="table" style={{ marginTop: 0, boxShadow: "none", border: "none", borderRadius: 0 }}>
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Stock</th><th>Threshold</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.slice(0, 5).map(p => (
                <tr key={p.id}>
                  <td data-label="Product"><strong>{p.name}</strong></td>
                  <td data-label="SKU"><code style={{ background: "#F3F0E6", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{p.sku}</code></td>
                  <td data-label="Stock" style={{ color: "#EF4444", fontWeight: 700 }}>{p.stock_quantity}</td>
                  <td data-label="Threshold" style={{ color: "var(--text-muted)" }}>{p.low_stock_threshold}</td>
                  <td data-label="Action"><Link to="/products" className="btn-sm">Restock →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>🕑 Recent Orders</h3>
            <Link to="/orders" className="btn-sm">View All →</Link>
          </div>
          <table className="table" style={{ marginTop: 0, boxShadow: "none", border: "none", borderRadius: 0 }}>
            <thead>
              <tr>
                <th>Order</th><th>Status</th><th>Total</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => {
                const st = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
                return (
                  <tr key={o.id}>
                    <td data-label="Order" style={{ fontWeight: 600, color: "var(--text)" }}>#{o.id}</td>
                    <td data-label="Status">
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
                        {o.status}
                      </span>
                    </td>
                    <td data-label="Total" style={{ fontWeight: 600 }}>₹{Number(o.total_amount).toFixed(2)}</td>
                    <td data-label="Date" style={{ color: "var(--text-muted)" }}>{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && recentOrders.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <h3 style={{ justifyContent: "center", marginBottom: 8 }}>No orders yet</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>Browse products and place your first order.</p>
          <Link to="/products" className="btn">Browse Products</Link>
        </div>
      )}
    </div>
  );
}
