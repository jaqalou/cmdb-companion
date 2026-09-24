import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type Dimension = "region" | "environment" | "application_name" | "ci_class";
type ScopeRow = { id: string; dimension: Dimension; value: string };

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "region", label: "Region" },
  { key: "environment", label: "Environment" },
  { key: "application_name", label: "Application name" },
  { key: "ci_class", label: "Component type" },
];

const CLASSES = [
  { value: "cmdb_ci_server", label: "Servers" },
  { value: "cmdb_ci_db_mssql_instance", label: "SQL instances" },
  { value: "cmdb_ci_netgear_switch", label: "Switches" },
  { value: "cmdb_ci_wap", label: "Access points" },
];

function labelFor(dim: Dimension, value: string) {
  if (value === "*") return "Any";
  if (dim === "ci_class") return CLASSES.find((c) => c.value === value)?.label ?? value;
  return value;
}

export function ScopeEditor({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const key = ["user-scopes", userId];
  const [dim, setDim] = useState<Dimension>("region");
  const [value, setValue] = useState("");

  const scopes = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_scopes" as never)
        .select("id, dimension, value")
        .eq("user_id", userId)
        .order("dimension");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ScopeRow[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const v = value.trim();
      if (!v) throw new Error("Enter a value");
      const { error } = await supabase
        .from("user_scopes" as never)
        .insert({ user_id: userId, dimension: dim, value: v } as never);
      if (error) throw new Error(error.code === "23505" ? "That scope already exists" : error.message);
    },
    onSuccess: () => {
      setValue("");
      qc.invalidateQueries({ queryKey: key });
      toast.success("Scope added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add scope"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_scopes" as never).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove scope"),
  });

  const rows = scopes.data ?? [];

  return (
    <div className="space-y-3 py-2">
      {isAdmin ? (
        <p className="text-xs text-muted-foreground">
          This account is an administrator and always sees everything. Scopes only apply to viewers
          and editors.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          The account sees only records that match <strong>every</strong> type of scope listed
          below. Several values of the same type mean "any of these". Use <code>*</code> for "any
          value". With no scopes, the account only sees names and OS/firmware versions.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {scopes.isLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
        {!scopes.isLoading && rows.length === 0 && (
          <span className="text-xs text-muted-foreground">No scopes: names-only access.</span>
        )}
        {rows.map((s) => (
          <span key={s.id} className="chip inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">
              {DIMENSIONS.find((d) => d.key === s.dimension)?.label}:
            </span>
            {labelFor(s.dimension, s.value)}
            <button
              type="button"
              aria-label="Remove scope"
              disabled={remove.isPending}
              onClick={() => remove.mutate(s.id)}
              className="ml-1 text-muted-foreground hover:text-destructive"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <select
          value={dim}
          onChange={(e) => {
            setDim(e.target.value as Dimension);
            setValue("");
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          {DIMENSIONS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        {dim === "ci_class" ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="">Choose…</option>
            {CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
            <option value="*">Any</option>
          </select>
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. EMEA, Production, SAP or *"
            className="h-8 w-64 rounded-md border border-border bg-background px-2 text-xs"
          />
        )}
        <button
          type="submit"
          disabled={add.isPending}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/60 disabled:opacity-50"
        >
          Add scope
        </button>
      </form>
    </div>
  );
}
