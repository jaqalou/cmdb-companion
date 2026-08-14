import { Link, useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/servers", label: "Servers" },
  { to: "/databases", label: "SQL Instances" },
  { to: "/switches", label: "Switches" },
  { to: "/access-points", label: "Access Points" },
  { to: "/api", label: "Table API" },
];

export function SiteHeader() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-6 px-6 lg:px-10">
        <Link to="/" className="font-display text-2xl uppercase tracking-tighter">
          CB Assets<span className="text-gold">.</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-[11px] font-bold uppercase tracking-[0.15em] transition-colors hover:text-gold [&.active]:text-gold"
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="hidden items-center gap-4 lg:flex">
            <span className="text-right text-[11px] leading-tight text-muted-foreground">
              {user.email}
              <span className="block font-bold uppercase tracking-[0.18em] text-gold">
                {roles[0] ?? "pending access"}
              </span>
            </span>
            <button onClick={signOut} className="btn-outline px-5 py-2">
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/auth" className="btn-outline hidden px-5 py-2 lg:inline-flex">
            Sign in
          </Link>
        )}
      </div>
      <div className="flex items-center gap-5 overflow-x-auto border-t-2 border-foreground px-6 py-3 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="shrink-0 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors hover:text-gold [&.active]:text-gold"
            activeOptions={{ exact: item.to === "/" }}
          >
            {item.label}
          </Link>
        ))}
        {user ? (
          <button onClick={signOut} className="ml-auto shrink-0 text-[10px] font-bold tracking-[0.15em] text-gold uppercase">
            Sign out
          </button>
        ) : (
          <Link to="/auth" className="ml-auto shrink-0 text-[10px] font-bold tracking-[0.15em] text-gold uppercase">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-foreground bg-background">
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
                Table API reference
              </Link>
            </li>
            <li className="font-mono text-xs">/api/public/now/table/&#123;table&#125;</li>
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
      <div className="border-t-2 border-foreground">
        <div className="mx-auto flex max-w-[1400px] flex-wrap gap-x-6 gap-y-2 px-6 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground lg:px-10">
          <span>CB Assets Group IT — internal configuration management platform.</span>
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