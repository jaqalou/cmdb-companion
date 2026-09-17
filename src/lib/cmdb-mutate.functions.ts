/**
 * Write operations shared by the UI. They run as the signed-in user, so the
 * Postgres RLS policies (editor/admin) remain the single source of authority.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BOOLEAN_FIELDS, CI_CLASSES, DATE_FIELDS, ESU_OPTIONS, NUMERIC_FIELDS } from "@/lib/cmdb-schema";

const TABLES = Object.keys(CI_CLASSES) as [string, ...string[]];

const deleteInput = z.object({
  table: z.enum(TABLES),
  sysIds: z.array(z.string().uuid()).min(1).max(200),
});

export const deleteCiRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from(data.table as "cmdb_ci_server")
      .delete({ count: "exact" })
      .in("sys_id", data.sysIds);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Nothing was deleted — administrator access is required.");
    return { deleted: count };
  });

const snoozeInput = z.object({
  table: z.enum(TABLES),
  sysId: z.string().uuid(),
  snoozed: z.boolean(),
});

export const setCiSnoozed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => snoozeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from(data.table as "cmdb_ci_server")
      .update({ snoozed: data.snoozed } as never, { count: "exact" })
      .eq("sys_id", data.sysId);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Update rejected — editor access is required.");
    return { snoozed: data.snoozed };
  });

const updateInput = z.object({
  table: z.enum(TABLES),
  sysId: z.string().uuid(),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

/**
 * Field-level edit of a CI. Runs as the signed-in user, so the same
 * editor/admin RLS policy the REST dialects hit decides whether it lands.
 */
export const updateCiRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateInput.parse(data))
  .handler(async ({ data, context }) => {
    const cls = CI_CLASSES[data.table as keyof typeof CI_CLASSES];
    const allowed = new Set(cls.fields.map((f) => f.name));

    const patch: Record<string, string | number | boolean | null> = {};
    for (const [key, raw] of Object.entries(data.values)) {
      if (!allowed.has(key)) continue;
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (BOOLEAN_FIELDS.has(key)) {
        patch[key] = value === true || value === "true";
        continue;
      }
      if (value === "" || value === null || value === undefined) {
        patch[key] = null;
        continue;
      }
      if (NUMERIC_FIELDS.has(key)) {
        const n = Number(value);
        if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
        patch[key] = Math.trunc(n);
      } else {
        const text = String(value);
        if (key === "esu" && !ESU_OPTIONS.includes(text))
          throw new Error(`ESU must be one of: ${ESU_OPTIONS.join(", ")}`);
        if (DATE_FIELDS.has(key) && !/^\d{4}-\d{2}-\d{2}$/.test(text))
          throw new Error(`${key} must be a date (yyyy-mm-dd)`);
        patch[key] = text;
      }
    }

    if (Object.keys(patch).length === 0) return { updated: 0 };
    if (data.values[cls.display] !== undefined && !patch[cls.display])
      throw new Error(`${cls.display} is required`);

    const { error, count } = await context.supabase
      .from(cls.table)
      .update(patch as never, { count: "exact" })
      .eq("sys_id", data.sysId);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Update rejected — editor or administrator access is required.");
    return { updated: count };
  });
