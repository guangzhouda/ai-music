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
          <span className="brand-mark">A</span>
          <div>
            <strong>{appMeta.name}</strong>
            <p>{appMeta.tagline}</p>
          </div>
        </Link>
        <nav className="nav">
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
        <button className="ghost-button" onClick={() => void props.onRefresh()} type="button">
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
  return <div className="error-banner">接口错误：{props.message}</div>;
}
