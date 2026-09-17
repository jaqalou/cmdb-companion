import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Database,
  Gauge,
  KeyRound,
  LogOut,

  Menu,
  Network,
  Plus,
  Server,
  ShieldCheck,
  Users,
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
      { to: "/new", label: "Add Item", icon: Plus },
    ],
  },
  {
    group: "Tools",
    items: [
      { to: "/api", label: "REST API", icon: BookOpen },
      { to: "/admin/api-tokens", label: "API Tokens", icon: KeyRound },
      { to: "/security", label: "Security", icon: ShieldCheck },
      { to: "/admin/users", label: "Users & Access", icon: Users },

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
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-10 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-lg font-semibold">CB Assets</p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A single, trusted record of every server and database instance across the group —
            brewed from the same tables your integrations already speak to.
          </p>
        </div>
        <div>
          <p className="eyebrow text-muted-foreground">Configuration Items</p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <Link to="/servers" className="font-mono hover:text-primary">
                cmdb_ci_server
              </Link>
            </li>
            <li>
              <Link to="/databases" className="font-mono hover:text-primary">
                cmdb_ci_db_mssql_instance
              </Link>
            </li>
            <li>
              <Link to="/switches" className="font-mono hover:text-primary">
                cmdb_ci_netgear_switch
              </Link>
            </li>
            <li>
              <Link to="/access-points" className="font-mono hover:text-primary">
                cmdb_ci_wap
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-muted-foreground">Integration</p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <Link to="/api" className="hover:text-primary">
                REST API reference
              </Link>
            </li>
            <li className="font-mono text-xs">/api/public/apirest.php/&#123;itemtype&#125;</li>
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Privacy &amp; data protection
              </Link>
            </li>
            <li>
              <Link to="/security" className="hover:text-primary">
                Security &amp; NIS2 measures
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap gap-x-6 gap-y-2 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:px-8">
          <span>CB Group IT — internal configuration management platform.</span>
          <span>Access is authenticated, role-based and logged.</span>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="app-sidebar hidden w-60 shrink-0 flex-col lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Wordmark />
        <SidebarNav />
        <p className="border-t border-white/10 px-4 py-3 text-[10px] text-brand-foreground/40">
          GLPI-compatible REST API
        </p>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-brand-deep/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="app-sidebar absolute inset-y-0 left-0 flex w-64 flex-col">
            <div className="flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="mr-3 text-brand-foreground/70"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader onOpenMenu={() => setOpen(true)} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}