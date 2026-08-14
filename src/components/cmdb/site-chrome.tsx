import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/servers", label: "Servers" },
  { to: "/databases", label: "SQL Instances" },
  { to: "/api", label: "Table API" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 surface-brand">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-display text-2xl italic tracking-tight">Nordbryg</span>
          <span className="eyebrow mt-1 text-gold">Configuration Management</span>
        </Link>
        <nav className="hidden items-center gap-10 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm tracking-wide text-brand-foreground/75 transition-colors hover:text-gold [&.active]:text-gold"
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/api"
          className="hidden border border-gold/60 px-5 py-2 text-xs tracking-[0.2em] uppercase text-gold transition-colors hover:bg-gold hover:text-gold-foreground lg:inline-block"
        >
          Developers
        </Link>
      </div>
      <div className="gold-rule" />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 surface-brand">
      <div className="gold-rule" />
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 md:grid-cols-3 lg:px-10">
        <div>
          <p className="font-display text-3xl italic">Nordbryg CMDB</p>
          <p className="mt-4 max-w-sm text-sm text-brand-foreground/70">
            A single, trusted record of every server and database instance across the group —
            brewed from the same tables your integrations already speak to.
          </p>
        </div>
        <div>
          <p className="eyebrow text-gold">Configuration Items</p>
          <ul className="mt-4 space-y-2 text-sm text-brand-foreground/70">
            <li>
              <Link to="/servers" className="hover:text-gold">
                cmdb_ci_server
              </Link>
            </li>
            <li>
              <Link to="/databases" className="hover:text-gold">
                cmdb_ci_db_mssql_instance
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-gold">Integration</p>
          <ul className="mt-4 space-y-2 text-sm text-brand-foreground/70">
            <li>
              <Link to="/api" className="hover:text-gold">
                Table API reference
              </Link>
            </li>
            <li className="font-mono text-xs">/api/public/now/table/&#123;table&#125;</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-foreground/10">
        <div className="mx-auto max-w-[1400px] px-6 py-6 text-xs text-brand-foreground/50 lg:px-10">
          Nordbryg Group IT — internal configuration management platform.
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