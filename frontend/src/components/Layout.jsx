import Sidebar from "./Sidebar";
import { useLocation } from "react-router-dom";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/products": "Products",
  "/categories": "Categories",
  "/orders": "Orders",
  "/reports": "Reports",
  "/audit-logs": "Audit Logs",
  "/cart": "Cart",
  "/profile": "My Profile",
};

export default function Layout({ children }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || "ShopEase";

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
