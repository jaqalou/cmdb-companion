import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/cmdb/site-chrome";
import { useAuth } from "@/hooks/use-auth";
import { createCiRecord } from "@/lib/cmdb-create.functions";
import { CI_CLASSES, NUMERIC_FIELDS, groupFields } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "Add Configuration Item — CB Assets" },
      {
        name: "description",
        content:
          "Create a new server, SQL instance, network switch or access point record in the CB Assets CMDB.",
      },
      { property: "og:title", content: "Add Configuration Item — CB Assets" },
      {
        property: "og:description",
        content: "Register a new configuration item in the CB Assets inventory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewItemPage,
});

type TableKey = keyof typeof CI_CLASSES;

const DETAIL_ROUTES: Record<TableKey, string> = {
  cmdb_ci_server: "/servers/$sysId",
  cmdb_ci_db_mssql_instance: "/databases/$sysId",
  cmdb_ci_netgear_switch: "/switches/$sysId",
  cmdb_ci_wap: "/access-points/$sysId",
};

function NewItemPage() {
  const { canWrite, loading, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(createCiRecord);

  const [table, setTable] = useState<TableKey>("cmdb_ci_server");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const cls = CI_CLASSES[table];
  const groups = useMemo(() => groupFields(cls.fields), [cls.fields]);

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values[cls.display]?.trim()) {
      toast.error(`${cls.fields.find((f) => f.name === cls.display)?.label} is required`);
      return;
    }
    setSaving(true);
    try {
      const result = await submit({ data: { table, values } });
      await queryClient.invalidateQueries({ queryKey: ["cmdb", table] });
      toast.success("Configuration item created");
      navigate({
        to: DETAIL_ROUTES[table],
        params: { sysId: result.sys_id },
      } as never);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-5 lg:px-8">
          <p className="eyebrow text-muted-foreground">Create</p>
          <h1 className="mt-1 font-display text-2xl">Add configuration item</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Register a new CI. The same record can be created over REST with a POST to the GLPI or
            ServiceNow endpoint — see the API reference.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 lg:px-8">
        {!loading && !canWrite ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg">Editor access required</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {user
                ? "Your account can browse the inventory but not create records. Ask an administrator for the editor role."
                : "Sign in with a CB account that has the editor or admin role to create configuration items."}
            </p>
            {!user && (
              <Link to="/auth" className="btn-accent mt-4 inline-flex h-9 items-center px-4">
                Sign in
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <label
                htmlFor="ci-class"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                CI class
              </label>
              <select
                id="ci-class"
                value={table}
                onChange={(e) => {
                  setTable(e.target.value as TableKey);
                  setValues({});
                }}
                className="mt-2 h-9 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm"
              >
                {(Object.keys(CI_CLASSES) as TableKey[]).map((key) => (
                  <option key={key} value={key}>
                    {CI_CLASSES[key].label}
                  </option>
                ))}
              </select>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{cls.table}</p>
            </div>

            {groups.map((group) => (
              <div key={group.group} className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-4 py-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {group.group}
                  </h2>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.fields.map((field) => {
                    const required = field.name === cls.display;
                    return (
                      <div key={field.name} className="flex flex-col gap-1">
                        <label
                          htmlFor={`f-${field.name}`}
                          className="text-xs font-medium text-foreground"
                        >
                          {field.label}
                          {required && <span className="ml-1 text-primary">*</span>}
                        </label>
                        {field.options ? (
                          <select
                            id={`f-${field.name}`}
                            required={required}
                            value={values[field.name] ?? ""}
                            onChange={(e) => setField(field.name, e.target.value)}
                            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                          >
                            <option value="">—</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`f-${field.name}`}
                            type={
                              field.date
                                ? "date"
                                : NUMERIC_FIELDS.has(field.name)
                                  ? "number"
                                  : "text"
                            }
                            required={required}
                            value={values[field.name] ?? ""}
                            onChange={(e) => setField(field.name, e.target.value)}
                            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                          />
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {field.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn-accent h-9 px-5 disabled:opacity-60">
                {saving ? "Creating…" : "Create item"}
              </button>
              <button
                type="button"
                onClick={() => setValues({})}
                className="h-9 rounded-md border border-border px-4 text-sm"
              >
                Clear
              </button>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
}
