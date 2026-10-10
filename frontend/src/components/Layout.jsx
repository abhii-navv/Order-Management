import { useState } from "react";
import Sidebar from "./Sidebar";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-actions">
            <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "none" }} className="hide-on-mobile">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
