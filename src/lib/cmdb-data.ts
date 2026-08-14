import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type CiRecord = Record<string, string | number | null>;

async function fetchAll(table: "cmdb_ci_server" | "cmdb_ci_db_mssql_instance") {
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