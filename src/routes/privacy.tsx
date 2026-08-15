import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/cmdb/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Data Protection — CB Assets" },
      {
        name: "description",
        content:
          "How CB Assets handles personal data: categories processed, lawful basis, retention, data subject rights and how to raise a request.",
      },
      { property: "og:title", content: "Privacy & Data Protection — CB Assets" },
      {
        property: "og:description",
        content: "Personal data categories, lawful basis, retention and data subject rights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const REGISTER = [
  ["Technical owner", "Name / work contact of the accountable engineer", "Legitimate interest — Art. 6(1)(f)", "Employment + 12 months"],
  ["Support team", "Organisational unit responsible for the asset", "Legitimate interest — Art. 6(1)(f)", "Life of the CI"],
  ["IP address / hostname", "Network identifiers that may relate to a workstation or session", "Legitimate interest — Art. 6(1)(f)", "Life of the CI + 6 months"],
  ["Site address", "Physical location of the asset", "Legitimate interest — Art. 6(1)(f)", "Life of the CI"],
  ["Service account", "Named operational credential identifiers", "Legitimate interest — Art. 6(1)(f)", "Life of the instance"],
  ["Audit actor email", "Who made a configuration change and when", "Legal obligation / NIS2 accountability", "24 months"],
];

const RIGHTS = [
  ["Access — Art. 15", "Obtain a copy of the personal data held about you in the CMDB."],
  ["Rectification — Art. 16", "Correct an inaccurate owner, contact or team assignment."],
  ["Erasure — Art. 17", "Removal where the data is no longer necessary; audit entries required for NIS2 accountability are retained for their statutory period."],
  ["Restriction — Art. 18", "Suspend processing while a dispute over accuracy is resolved."],
  ["Objection — Art. 21", "Object to processing based on legitimate interest, on grounds relating to your situation."],
];

function PrivacyPage() {
  return (
    <PageShell>
      <section className="surface-brand">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
          <p className="eyebrow text-gold">Data protection</p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">Privacy notice</h1>
          <p className="mt-4 max-w-2xl text-brand-foreground/70">
            How this platform processes personal data under the GDPR, and how to exercise your
            rights. Statements below describe controls implemented in this application; the
            controller identity and contact details must be confirmed by the data protection
            owner before publication.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] space-y-16 px-6 py-16 lg:px-10">
        <div>
          <h2 className="font-display text-3xl text-brand">Why the CMDB holds personal data</h2>
          <div className="gold-rule mt-3 mb-6" />
          <p className="max-w-3xl text-muted-foreground">
            A configuration management database is primarily an asset register, but accountability
            fields inevitably identify people: the engineer who owns a server, the team on call, the
            named service account behind a SQL instance. Processing is limited to what is needed to
            operate, secure and support those assets — data minimisation is enforced by only
            collecting the columns listed below.
          </p>
        </div>

        <div>
          <h2 className="font-display text-3xl text-brand">Record of processing</h2>
          <div className="gold-rule mt-3 mb-6" />
          <div className="overflow-x-auto border border-foreground/10">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-sand">
                <tr>
                  {["Field", "Category", "Lawful basis", "Retention"].map((h) => (
                    <th key={h} className="eyebrow px-5 py-4 text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10 bg-card">
                {REGISTER.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={i === 0 ? "px-5 py-4 font-medium text-brand" : "px-5 py-4 text-muted-foreground"}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This table mirrors the <span className="font-mono">personal_data_register</span> table in
            the database, so the notice and the system cannot drift apart.
          </p>
        </div>

        <div>
          <h2 className="font-display text-3xl text-brand">Your rights</h2>
          <div className="gold-rule mt-3 mb-6" />
          <dl className="max-w-3xl divide-y divide-foreground/10">
            {RIGHTS.map(([right, detail]) => (
              <div key={right} className="py-4">
                <dt className="font-medium text-brand">{right}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-3xl text-muted-foreground">
            Requests are logged in the platform's data subject request register with a 30-day
            statutory deadline and tracked to completion by an administrator. You also have the
            right to lodge a complaint with your national supervisory authority.
          </p>
        </div>

        <div>
          <h2 className="font-display text-3xl text-brand">How data is protected</h2>
          <div className="gold-rule mt-3 mb-6" />
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-muted-foreground">
            <li>No anonymous access — every record read requires an authenticated session.</li>
            <li>Role-based authorisation enforced in the database, not only in the interface.</li>
            <li>Every change is written to an append-only audit trail attributing it to a person.</li>
            <li>Data is encrypted in transit (TLS, HSTS) and at rest by the managed platform.</li>
            <li>API responses containing personal data are marked non-cacheable.</li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}