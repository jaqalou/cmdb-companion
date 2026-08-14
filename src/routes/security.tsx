import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/cmdb/site-chrome";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & NIS2 Measures — Nordbryg CMDB" },
      {
        name: "description",
        content:
          "Technical and organisational security measures implemented in the CMDB, mapped to NIS2 Article 21 risk-management obligations.",
      },
      { property: "og:title", content: "Security & NIS2 Measures — Nordbryg CMDB" },
      {
        property: "og:description",
        content: "Access control, logging, encryption and asset management mapped to NIS2 Art. 21.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

const MEASURES: [string, string, string][] = [
  [
    "Art. 21(2)(a) — Risk analysis & information system security",
    "Asset inventory as the control base",
    "Every server and database instance is registered with environment, criticality (SLA), owner, OS lifecycle and end-of-life date, so exposure can be assessed against a complete asset picture.",
  ],
  [
    "Art. 21(2)(b) — Incident handling",
    "Attributable change history",
    "An append-only audit trail records every create, update and delete with actor identity, timestamp, changed fields and before/after values. Entries cannot be modified or deleted through the application.",
  ],
  [
    "Art. 21(2)(c) — Business continuity & backup",
    "Backup posture tracked per asset",
    "Backup status, backup schedule, maintenance windows and recovery-relevant attributes are first-class fields on each configuration item and are filterable for gap reporting.",
  ],
  [
    "Art. 21(2)(d) — Supply chain security",
    "Vendor and platform attributes",
    "Subscription, appliance, managed-service and edition fields identify third-party dependencies per asset. Application dependencies are scanned for known vulnerabilities.",
  ],
  [
    "Art. 21(2)(e) — Security in acquisition, development & maintenance",
    "Lifecycle and vulnerability tracking",
    "OS lifecycle, support cycle, end-of-life date, build/version and version-lock state are recorded so unsupported software is identifiable before it becomes an exposure.",
  ],
  [
    "Art. 21(2)(f) — Effectiveness assessment",
    "Continuous configuration checks",
    "Database access rules are linted for misconfiguration, and privileged helper functions are executable only by the roles that require them.",
  ],
  [
    "Art. 21(2)(g) — Cyber hygiene",
    "Hardened transport and browser policy",
    "HSTS with preload, MIME-sniffing protection, clickjacking protection, strict referrer policy, a restrictive permissions policy and no-store caching for data responses.",
  ],
  [
    "Art. 21(2)(h) — Cryptography",
    "Encryption in transit and at rest",
    "All traffic is TLS-only and forced by HSTS. Data at rest is encrypted by the managed PostgreSQL platform. No credentials or secrets are stored in the application bundle.",
  ],
  [
    "Art. 21(2)(i) — Human resources & access control",
    "Least-privilege, role-based access",
    "Roles (admin, editor, viewer) are held in a dedicated table and enforced by row-level security in PostgreSQL. Viewers may read, editors may amend, only administrators may delete records, read the audit trail or grant roles.",
  ],
  [
    "Art. 21(2)(j) — Multi-factor & secured communications",
    "Federated identity",
    "Sign-in supports federated Google identity, allowing the organisation's existing MFA and conditional-access policy to govern CMDB access. Password accounts require at least 12 characters.",
  ],
];

function SecurityPage() {
  return (
    <PageShell>
      <section className="surface-brand">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
          <p className="eyebrow text-gold">Security</p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">Technical measures</h1>
          <p className="mt-4 max-w-2xl text-brand-foreground/70">
            The controls implemented in this platform, mapped to the NIS2 Article 21
            risk-management measures. This describes the application's own safeguards; it is not a
            statement of certification or of organisation-wide compliance.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        <div className="divide-y-2 divide-foreground border-2 border-foreground bg-card">
          {MEASURES.map(([article, title, detail]) => (
            <div key={article} className="grid gap-4 px-6 py-8 lg:grid-cols-[320px_1fr] lg:px-10">
              <p className="eyebrow text-muted-foreground">{article}</p>
              <div>
                <h2 className="font-display text-2xl text-brand">{title}</h2>
                <p className="mt-2 max-w-3xl text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl">
          <h2 className="font-display text-3xl text-brand">Reporting a vulnerability</h2>
          <div className="gold-rule mt-3 mb-6" />
          <p className="text-muted-foreground">
            If you believe you have found a security weakness in this platform, report it to the
            Nordbryg Group IT security team before disclosing it elsewhere. Include the affected
            URL, the steps to reproduce and the impact you observed. The security contact address
            and response targets should be confirmed by the security owner and added here.
          </p>
        </div>

        <div className="mt-16 max-w-3xl">
          <h2 className="font-display text-3xl text-brand">Outstanding organisational work</h2>
          <div className="gold-rule mt-3 mb-6" />
          <p className="text-muted-foreground">
            NIS2 and the GDPR also require measures this application cannot provide on its own:
            a named controller and data protection contact, incident notification procedures and
            deadlines, management accountability and training, supplier contracts and
            data-processing agreements, and periodic access reviews. These belong to the
            organisation, not the software.
          </p>
        </div>
      </section>
    </PageShell>
  );
}