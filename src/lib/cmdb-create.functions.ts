/**
 * Create-CI server function. Runs as the signed-in user (RLS enforces the
 * editor/admin write policy) and shares the same table registry the REST
 * dialects use, so GLPI/ServiceNow POSTs and the UI stay in sync.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BOOLEAN_FIELDS, CI_CLASSES, DATE_FIELDS, ESU_OPTIONS, NUMERIC_FIELDS } from "@/lib/cmdb-schema";

const TABLES = Object.keys(CI_CLASSES) as (keyof typeof CI_CLASSES)[];

const schema = z.object({
  table: z.enum(TABLES as [string, ...string[]]),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const createCiRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const cls = CI_CLASSES[data.table as keyof typeof CI_CLASSES];
    const allowed = new Set(cls.fields.map((f) => f.name));

    const row: Record<string, string | number | boolean | null> = {};
    for (const [key, raw] of Object.entries(data.values)) {
      if (!allowed.has(key)) continue;
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (BOOLEAN_FIELDS.has(key)) {
        row[key] = value === true || value === "true";
        continue;
      }
      if (value === "" || value === null || value === undefined) continue;
      if (NUMERIC_FIELDS.has(key)) {
        const n = Number(value);
        if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
        row[key] = Math.trunc(n);
      } else {
        const text = String(value);
        if (key === "esu" && !ESU_OPTIONS.includes(text))
          throw new Error(`ESU must be one of: ${ESU_OPTIONS.join(", ")}`);
        if (DATE_FIELDS.has(key) && !/^\d{4}-\d{2}-\d{2}$/.test(text))
          throw new Error(`${key} must be a date (yyyy-mm-dd)`);
        row[key] = text;
      }
    }

    const display = cls.display;
    if (!row[display]) throw new Error(`${display} is required`);

    // Reject an obvious duplicate before hitting the database, so the user gets
    // a readable message instead of a second look-alike record.
    const { data: existing } = await context.supabase
      .from(cls.table)
      .select("sys_id")
      .ilike(display, String(row[display]))
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error(
        `A ${cls.label.replace(/s$/, "")} named "${row[display]}" already exists. Open that record to edit it, or use a different name.`,
      );
    }

    const { data: inserted, error } = await context.supabase
      .from(cls.table)
      .insert(row as never)
      .select("sys_id")
      .single();

    if (error) {
      const msg = error.message ?? "";
      if (/row-level security|permission denied/i.test(msg))
        throw new Error("Your account does not have permission to create records. Ask an administrator for the editor role.");
      if (/duplicate key/i.test(msg))
        throw new Error(`A record with that ${display.replace(/_/g, " ")} already exists.`);
      if (/invalid input syntax for type (integer|date)/i.test(msg))
        throw new Error("One of the values has the wrong format — check the number and date fields.");
      throw new Error(msg || "Could not create the record");
    }
    return { sys_id: (inserted as { sys_id: string }).sys_id, path: cls.path };
  });
