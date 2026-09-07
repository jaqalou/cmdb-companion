/**
 * Write operations shared by the UI. They run as the signed-in user, so the
 * Postgres RLS policies (editor/admin) remain the single source of authority.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CI_CLASSES } from "@/lib/cmdb-schema";

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
