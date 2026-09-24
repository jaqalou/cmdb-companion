/**
 * Names-only inventory for accounts that hold a role but no access scopes.
 * The database function re-checks the caller, and only the server may run it.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tableInput = z.object({
  table: z.enum([
    "cmdb_ci_server",
    "cmdb_ci_db_mssql_instance",
    "cmdb_ci_netgear_switch",
    "cmdb_ci_wap",
  ]),
});

export const getLimitedInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tableInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("cmdb_limited_list" as never, {
      _uid: context.userId,
      _table: data.table,
    } as never);
    if (error) throw new Error((error as { message: string }).message);
    return ((rows ?? []) as unknown as Record<string, string | null>[]).map((r) => ({
      ...r,
      __limited: true,
    }));
  });
