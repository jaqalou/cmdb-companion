import { Link } from "@tanstack/react-router";

import type { CiRecord } from "@/lib/cmdb-data";
import { groupFields, type FieldDef } from "@/lib/cmdb-schema";

type Props = {
  record: CiRecord;
  fields: FieldDef[];
  table: string;
  title: string;
  subtitle: string;
  backTo: "/servers" | "/databases" | "/switches" | "/access-points";
  backLabel: string;
};

export function CiDetail({ record, fields, table, title, subtitle, backTo, backLabel }: Props) {
  const groups = groupFields(fields);
  const sysId = String(record["sys_id"]);

  return (
    <div>
      <section className="border-b border-foreground/10 bg-foreground text-background">
        <div className="mx-auto max-w-[1400px] px-6 py-14 lg:px-10">
          <Link to={backTo} className="eyebrow text-gold hover:underline">
            ← {backLabel}
          </Link>
          <h1 className="mt-6 text-5xl uppercase md:text-6xl">{title}</h1>
          <p className="mt-3 font-medium opacity-70">{subtitle}</p>
          <dl className="mt-8 grid gap-6 border-t-2 border-background/20 pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow text-gold">sys_id</dt>
              <dd className="mt-2 font-mono text-xs break-all opacity-80">{sysId}</dd>
            </div>
            <div>
              <dt className="eyebrow text-gold">Class</dt>
              <dd className="mt-2 font-mono text-xs opacity-80">{table}</dd>
            </div>
            <div>
              <dt className="eyebrow text-gold">Last updated</dt>
              <dd className="mt-2 opacity-80">
                {new Date(String(record["sys_updated_on"])).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-2">
          {groups.map((g) => (
            <div key={g.group} className="brutal-card p-6">
              <h2 className="text-2xl uppercase">{g.group}</h2>
              <div className="gold-rule mt-3 mb-5" />
              <dl className="divide-y divide-foreground/10">
                {g.fields.map((f) => (
                  <div key={f.name} className="grid grid-cols-2 gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="font-medium text-foreground">
                      {record[f.name] === null || record[f.name] === undefined || record[f.name] === ""
                        ? "—"
                        : String(record[f.name])}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="brutal-card mt-16 p-6">
          <p className="eyebrow text-muted-foreground">Fetch this record via the Table API</p>
          <pre className="mt-4 overflow-x-auto border border-foreground/10 bg-foreground p-5 font-mono text-xs text-background">
{`GET /api/public/now/table/${table}/${sysId}`}
          </pre>
        </div>
      </section>
    </div>
  );
}