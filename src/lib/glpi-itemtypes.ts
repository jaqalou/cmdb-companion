/** GLPI itemtype <-> CMDB table mapping (client-safe, no server imports). */
export const ITEMTYPES: Record<string, string> = {
  Computer: "cmdb_ci_server",
  DatabaseInstance: "cmdb_ci_db_mssql_instance",
  NetworkEquipment: "cmdb_ci_netgear_switch",
  AccessPoint: "cmdb_ci_wap",
};

export const TABLE_TO_ITEMTYPE: Record<string, string> = Object.fromEntries(
  Object.entries(ITEMTYPES).map(([itemtype, table]) => [table, itemtype]),
);

/** Case-insensitive itemtype lookup, as GLPI accepts `Computer` and `computer`. */
export function resolveItemtype(name: string): { itemtype: string; table: string } | null {
  const key = Object.keys(ITEMTYPES).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? { itemtype: key, table: ITEMTYPES[key]! } : null;
}
