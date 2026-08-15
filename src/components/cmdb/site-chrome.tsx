import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Database,
  Gauge,
  LogOut,
  Menu,
  Network,
  Server,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const MENU: { group: string; items: { to: string; label: string; icon: typeof Server }[] }[] = [
  {
    group: "Dashboard",
    items: [{ to: "/", label: "Overview", icon: Gauge }],
  },
  {
    group: "Assets",
    items: [
      { to: "/servers", label: "Servers", icon: Server },
      { to: "/databases", label: "SQL Instances", icon: Database },
      { to: "/switches", label: "Switches", icon: Network },
      { to: "/access-points", label: "Access Points", icon: Wifi },
    ],
  },
  {
    group: "Tools",
    items: [
      { to: "/api", label: "REST API", icon: BookOpen },
      { to: "/security", label: "Security", icon: ShieldCheck },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {MENU.map((section) => (
        <div key={section.group} className="mb-4">
          <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-foreground/40">
            {section.group}
          </p>
          {section.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className="sidebar-link"
              activeOptions={{ exact: item.to === "/" }}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Wordmark() {
  return (
    <Link
      to="/"
      className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4 font-display text-lg font-semibold tracking-tight text-brand-foreground"
    >
      <span className="grid size-7 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
        CB
      </span>
      CB Assets
    </Link>
  );
}

export function SiteHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, roles } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="glass-bar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="btn-outline size-9 lg:hidden"
      >
        <Menu className="size-4" />
      </button>
      <p className="text-sm font-semibold">Configuration Management Database</p>
      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <>
            <span className="hidden text-right text-[11px] leading-tight text-muted-foreground sm:block">
              {user.email}
              <span className="block font-semibold uppercase tracking-[0.1em] text-primary">
                {roles[0] ?? "pending access"}
              </span>
            </span>
            <button onClick={signOut} className="btn-outline h-9 gap-2 px-3">
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn-accent h-9 px-4">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-foreground/10 bg-background">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 md:grid-cols-3 lg:px-10">
        <div>
          <p className="font-display text-3xl uppercase tracking-tighter">
            CB Assets<span className="text-gold">.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            A single, trusted record of every server and database instance across the group —
            brewed from the same tables your integrations already speak to.
          </p>
        </div>
        <div>
          <p className="eyebrow text-gold">Configuration Items</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/servers" className="font-mono hover:text-gold">
                cmdb_ci_server
              </Link>
            </li>
            <li>
              <Link to="/databases" className="font-mono hover:text-gold">
                cmdb_ci_db_mssql_instance
              </Link>
            </li>
            <li>
              <Link to="/switches" className="font-mono hover:text-gold">
                cmdb_ci_netgear_switch
              </Link>
            </li>
            <li>
              <Link to="/access-points" className="font-mono hover:text-gold">
                cmdb_ci_wap
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-gold">Integration</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/api" className="hover:text-gold">
                REST API reference
              </Link>
            </li>
            <li className="font-mono text-xs">/api/public/apirest.php/&#123;itemtype&#125;</li>
            <li>
              <Link to="/privacy" className="hover:text-gold">
                Privacy &amp; data protection
              </Link>
            </li>
            <li>
              <Link to="/security" className="hover:text-gold">
                Security &amp; NIS2 measures
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap gap-x-6 gap-y-2 px-6 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground lg:px-10">
          <span>CB Group IT — internal configuration management platform.</span>
          <span>Access is authenticated, role-based and logged.</span>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}