/**
 * One registry of CI classes, with the name each dialect uses for it.
 * Adding a ServiceNow-only alias or renaming a GLPI itemtype happens here only.
 */
export type CiClass = {
  /** Physical Postgres table. */
  table: string;
  /** GLPI itemtype name. */
  itemtype: string;
  /** ServiceNow table name (sys_class_name). */
  snowTable: string;
  label: string;
};

export const CI_CLASSES: CiClass[] = [
  { table: "cmdb_ci_server", itemtype: "Computer", snowTable: "cmdb_ci_server", label: "Servers" },
  {
    table: "cmdb_ci_db_mssql_instance",
    itemtype: "DatabaseInstance",
    snowTable: "cmdb_ci_db_mssql_instance",
    label: "SQL instances",
  },
  {
    table: "cmdb_ci_netgear_switch",
    itemtype: "NetworkEquipment",
    snowTable: "cmdb_ci_netgear_switch",
    label: "Switches",
  },
  { table: "cmdb_ci_wap", itemtype: "AccessPoint", snowTable: "cmdb_ci_wap", label: "Access points" },
];

function find(name: string, key: "itemtype" | "snowTable") {
  const hit = CI_CLASSES.find((c) => c[key].toLowerCase() === name.toLowerCase());
  return hit ?? null;
}

export const resolveGlpiItemtype = (name: string) => find(name, "itemtype");
export const resolveSnowTable = (name: string) => find(name, "snowTable");
