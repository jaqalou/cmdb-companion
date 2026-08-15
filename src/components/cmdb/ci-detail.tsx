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

import { TABLE_TO_ITEMTYPE } from "@/lib/glpi-itemtypes";

export function CiDetail({ record, fields, table, title, subtitle, backTo, backLabel }: Props) {
  const groups = groupFields(fields);
  const sysId = String(record["sys_id"]);

  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-5 lg:px-8">
          <nav className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Link to={backTo} className="hover:text-primary hover:underline">
              {backLabel}
            </Link>
            <span>/</span>
            <span className="font-mono">{sysId.slice(0, 8)}</span>
          </nav>
          <h1 className="mt-1 font-display text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <dl className="mt-4 grid gap-4 border-t border-border pt-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow text-muted-foreground">sys_id</dt>
              <dd className="mt-1 font-mono text-xs break-all">{sysId}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted-foreground">Class</dt>
              <dd className="mt-1 font-mono text-xs">{table}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted-foreground">Last updated</dt>
              <dd className="mt-1 text-xs">
                {new Date(String(record["sys_updated_on"])).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((g) => (
            <div key={g.group} className="brutal-card overflow-hidden">
              <h2 className="border-b border-border bg-secondary px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.06em]">
                {g.group}
              </h2>
              <dl className="divide-y divide-border">
                {g.fields.map((f) => (
                  <div key={f.name} className="grid grid-cols-2 gap-4 px-4 py-2 text-[13px]">
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

        <div className="brutal-card mt-6 p-4">
          <p className="eyebrow text-muted-foreground">Fetch this record via the REST API</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-brand-deep p-4 font-mono text-xs text-brand-foreground">
{`GET /api/public/apirest.php/${TABLE_TO_ITEMTYPE[table] ?? table}/${sysId}`}
          </pre>
        </div>
      </section>
    </div>
  );
}