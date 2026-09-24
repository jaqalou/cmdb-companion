import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getLimitedInventory } from "@/lib/cmdb-scope.functions";

export type CiRecord = Record<string, string | number | boolean | null>;

type CiTable =
  | "cmdb_ci_server"
  | "cmdb_ci_db_mssql_instance"
  | "cmdb_ci_netgear_switch"
  | "cmdb_ci_wap";

export type AccessMode = "full" | "scoped" | "limited" | "none";

async function fetchAccessMode(): Promise<AccessMode> {
  const { data, error } = await supabase.rpc("cmdb_access_mode" as never);
  if (error) return "none";
  return (data as unknown as AccessMode) ?? "none";
}

export const accessModeQuery = queryOptions({
  queryKey: ["cmdb", "access-mode"],
  queryFn: fetchAccessMode,
});

async function fetchAll(table: CiTable) {
  const mode = await fetchAccessMode();
  if (mode === "limited") {
    return (await getLimitedInventory({ data: { table } })) as unknown as CiRecord[];
  }
  const { data, error } = await supabase.from(table).select("*").order("sys_created_on");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CiRecord[];
}

export const serversQuery = queryOptions({
  queryKey: ["cmdb", "cmdb_ci_server"],
  queryFn: () => fetchAll("cmdb_ci_server"),
});

export const instancesQuery = queryOptions({
  queryKey: ["cmdb", "cmdb_ci_db_mssql_instance"],
  queryFn: () => fetchAll("cmdb_ci_db_mssql_instance"),
});

export const switchesQuery = queryOptions({
  queryKey: ["cmdb", "cmdb_ci_netgear_switch"],
  queryFn: () => fetchAll("cmdb_ci_netgear_switch"),
});

export const accessPointsQuery = queryOptions({
  queryKey: ["cmdb", "cmdb_ci_wap"],
  queryFn: () => fetchAll("cmdb_ci_wap"),
});
