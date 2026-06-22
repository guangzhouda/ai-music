import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { cx, Panel } from "@ai-music/ui";
import { appMeta } from "@ai-music/config";
import { navItems, secondaryItems } from "../data/options";

interface LayoutProps {
  children: ReactNode;
  error?: string;
  onRefresh: () => void;
}

export function Layout(props: LayoutProps) {
  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </span>
          <div>
            <strong>{appMeta.name}</strong>
            <p>{appMeta.tagline}</p>
          </div>
        </Link>
        <nav className="nav" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cx("nav-link", isActive && "nav-link-active")}
              end={item.path === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="ghost-button"
          onClick={() => void props.onRefresh()}
          type="button"
          aria-label="刷新数据"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.4rem", verticalAlign: "-2px" }}>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          刷新数据
        </button>
      </header>
      <main className="page">
        {props.error ? <ErrorBanner message={props.error} /> : null}
        {props.children}
      </main>
      <footer className="layout-footer">
        {secondaryItems.map((item) => (
          <Link key={item.path} to={item.path} className="footer-link">{item.label}</Link>
        ))}
      </footer>
    </div>
  );
}

function ErrorBanner(props: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginRight: "0.5rem" }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        接口错误
      </strong>
      {props.message}
    </div>
  );
}
