import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import type { CiRecord } from "@/lib/cmdb-data";
import { groupFields, NUMERIC_FIELDS, type FieldDef } from "@/lib/cmdb-schema";
import { updateCiRecord } from "@/lib/cmdb-mutate.functions";
import { TABLE_TO_ITEMTYPE } from "@/lib/glpi-itemtypes";

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
  const { canWrite } = useAuth();
  const queryClient = useQueryClient();
  const save = useServerFn(updateCiRecord);

  const initial = useMemo(() => {
    const draft: Record<string, string> = {};
    for (const f of fields) {
      const v = record[f.name];
      draft[f.name] = v === null || v === undefined ? "" : String(v);
    }
    return draft;
  }, [fields, record]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      const values: Record<string, string> = {};
      for (const f of fields) {
        if (draft[f.name] !== initial[f.name]) values[f.name] = draft[f.name] ?? "";
      }
      if (Object.keys(values).length === 0) return { updated: 0 };
      return save({ data: { table, sysId, values } });
    },
    onSuccess: async (result) => {
      setEditing(false);
      if (result.updated === 0) {
        toast.info("No changes to save");
        return;
      }
      toast.success("Record updated");
      await queryClient.invalidateQueries({ queryKey: ["cmdb", table] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl">{title}</h1>
            {canWrite && (
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-border px-4 py-1.5 text-[13px] font-medium hover:bg-secondary"
                      onClick={() => {
                        setDraft(initial);
                        setEditing(false);
                      }}
                      disabled={mutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      onClick={() => mutation.mutate()}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Saving…" : "Save changes"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90"
                    onClick={() => setEditing(true)}
                  >
                    Edit record
                  </button>
                )}
              </div>
            )}
          </div>
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
                      {editing ? (
                        <Input
                          className="h-8 text-[13px]"
                          type={NUMERIC_FIELDS.has(f.name) ? "number" : "text"}
                          value={draft[f.name] ?? ""}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [f.name]: e.target.value }))
                          }
                        />
                      ) : record[f.name] === null ||
                        record[f.name] === undefined ||
                        record[f.name] === "" ? (
                        "—"
                      ) : (
                        String(record[f.name])
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="brutal-card mt-6 p-4">
          <p className="eyebrow text-muted-foreground">Read or edit this record via the REST API</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-brand-deep p-4 font-mono text-xs text-brand-foreground">
{`GET   /api/public/apirest.php/${TABLE_TO_ITEMTYPE[table] ?? table}/${sysId}
PATCH /api/public/apirest.php/${TABLE_TO_ITEMTYPE[table] ?? table}/${sysId}
      Authorization: Bearer <CB Assets access token>
      { "input": { "environment": "Production" } }

PATCH /api/public/now/table/${table}/${sysId}   (ServiceNow dialect)`}
          </pre>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Edits through the API run as the account behind the token, so administrator and editor
            accounts can write while everyone else stays read-only.
          </p>
        </div>
      </section>
    </div>
  );
}
