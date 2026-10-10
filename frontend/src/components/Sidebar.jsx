import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const NAV_ITEMS = [
  {
    section: "Main",
    links: [
      {
        to: "/",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        ),
        exact: true,
      },
      {
        to: "/products",
        label: "Products",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        ),
      },
      {
        to: "/categories",
        label: "Categories",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        ),
      },
      {
        to: "/orders",
        label: "Orders",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        ),
      },
      {
        to: "/cart",
        label: "Cart",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.96-1.61L23 6H6"/>
          </svg>
        ),
        showCart: true,
      },
    ],
  },
  {
    section: "Admin",
    adminOnly: true,
    links: [
      {
        to: "/reports",
        label: "Reports",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        ),
      },
      {
        to: "/audit-logs",
        label: "Audit Logs",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to) && to !== "/";

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const initials = (user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <Link to="/" className="sidebar-logo">
        <div className="sidebar-logo-icon">🛍️</div>
        <span className="sidebar-logo-text">
          Shop<span>Ease</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((group) => {
          if (group.adminOnly && user.role !== "admin") return null;
          return (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.links.map((item) => {
                if (item.adminOnly && user.role !== "admin") return null;
                const active = isActive(item.to, item.exact) ||
                  (item.to === "/" && location.pathname === "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar-link${active ? " active" : ""}`}
                  >
                    {item.icon}
                    {item.label}
                    {item.showCart && totalItems > 0 && (
                      <span className="badge-count">{totalItems}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user.name || "User"}</div>
          <div className="sidebar-user-role">{user.role || "member"}</div>
        </div>
        <button className="sidebar-logout-btn" onClick={logout} title="Logout">
          ⏻
        </button>
      </div>
    </aside>
  );
}
