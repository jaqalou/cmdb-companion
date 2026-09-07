import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type CiRecord = Record<string, string | number | boolean | null>;

type CiTable =
  | "cmdb_ci_server"
  | "cmdb_ci_db_mssql_instance"
  | "cmdb_ci_netgear_switch"
  | "cmdb_ci_wap";

async function fetchAll(table: CiTable) {
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