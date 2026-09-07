"""One registry of CI classes, with the name each dialect uses for it.

Adding a ServiceNow-only alias or renaming a GLPI itemtype happens here only.
Mirrors src/lib/cmdb-api/classes.ts.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CiClass:
    table: str      # physical PostgreSQL table
    itemtype: str   # GLPI itemtype name
    snow_table: str  # ServiceNow table name (sys_class_name)
    label: str


CI_CLASSES: list[CiClass] = [
    CiClass("cmdb_ci_server", "Computer", "cmdb_ci_server", "Servers"),
    CiClass("cmdb_ci_db_mssql_instance", "DatabaseInstance", "cmdb_ci_db_mssql_instance", "SQL instances"),
    CiClass("cmdb_ci_netgear_switch", "NetworkEquipment", "cmdb_ci_netgear_switch", "Switches"),
    CiClass("cmdb_ci_wap", "AccessPoint", "cmdb_ci_wap", "Access points"),
]

# Extra GLPI itemtype aliases accepted for convenience.
GLPI_ALIASES: dict[str, str] = {
    "computer": "cmdb_ci_server",
    "server": "cmdb_ci_server",
    "databaseinstance": "cmdb_ci_db_mssql_instance",
    "database": "cmdb_ci_db_mssql_instance",
    "networkequipment": "cmdb_ci_netgear_switch",
    "switch": "cmdb_ci_netgear_switch",
    "accesspoint": "cmdb_ci_wap",
    "wap": "cmdb_ci_wap",
}

# Which REST dialects are served. Both sit on the same core, so migrating from
# GLPI to ServiceNow is a flag flip here plus pointing clients at the new URL.
API_DIALECTS = {"glpi": True, "servicenow": True}


def _by_table(table: str) -> CiClass | None:
    return next((c for c in CI_CLASSES if c.table == table), None)


def resolve_glpi_itemtype(name: str) -> CiClass | None:
    key = (name or "").lower()
    hit = next((c for c in CI_CLASSES if c.itemtype.lower() == key), None)
    if hit:
        return hit
    table = GLPI_ALIASES.get(key)
    return _by_table(table) if table else None


def resolve_snow_table(name: str) -> CiClass | None:
    key = (name or "").lower()
    return next((c for c in CI_CLASSES if c.snow_table.lower() == key), None)
