export type FieldDef = {
  name: string;
  label: string;
  group: string;
  options?: string[];
  /** Render as a calendar picker and store as ISO yyyy-mm-dd. */
  date?: boolean;
  /** Render as a checkbox and store as a boolean. */
  bool?: boolean;
};

/** Allowed values for the ESU (Extended Security Updates) field. */
export const ESU_OPTIONS = ["EOL", "Active", "N/A", "False"];

/** Operational status shared by servers and SQL instances. */
export const STATUS_OPTIONS = [
  "Running",
  "Stopped",
  "Unallocated",
  "Retention",
  "Decommission planned",
  "Decommissioned",
];

const ESU_FIELDS: FieldDef[] = [
  { name: "esu", label: "ESU", group: "Lifecycle", options: ESU_OPTIONS },
  { name: "esu_start_date", label: "ESU Start Date", group: "Lifecycle", date: true },
  { name: "esu_end_date", label: "ESU End Date", group: "Lifecycle", date: true },
];

const SNOOZE_EXCLUSION_FIELDS: FieldDef[] = [
  { name: "snooze_exclusion", label: "Snooze Exclusion", group: "Operations", bool: true },
  {
    name: "snooze_exclusion_start_date",
    label: "Snooze Exclusion Start Date",
    group: "Operations",
    date: true,
  },
  {
    name: "snooze_exclusion_end_date",
    label: "Snooze Exclusion End Date",
    group: "Operations",
    date: true,
  },
  { name: "snooze_exclusion_reason", label: "Snooze Exclusion Reason", group: "Operations" },
];

/** Fields stored as text but edited as dates. */
export const DATE_FIELDS = new Set([
  "esu_start_date",
  "esu_end_date",
  "eol_date",
  "deployment_date",
  "snooze_exclusion_start_date",
  "snooze_exclusion_end_date",
]);

/** Columns stored as booleans in Postgres — forms submit true/false. */
export const BOOLEAN_FIELDS = new Set(["snooze_exclusion"]);

/** Accepts ISO and dd-mm-yyyy / dd-mm-yyyy input, returns yyyy-mm-dd for <input type="date">. */
export function toDateInputValue(raw: unknown): string {
  const text = raw === null || raw === undefined ? "" : String(raw).trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

export const SERVER_FIELDS: FieldDef[] = [
  { name: "hostname", label: "Hostname", group: "Identity" },
  { name: "virtual_hostname", label: "Virtual Hostname", group: "Identity" },
  { name: "type", label: "Type", group: "Identity" },
  { name: "status", label: "Status", group: "Identity", options: STATUS_OPTIONS },
  { name: "appliance", label: "Appliance", group: "Identity" },
  { name: "ldr", label: "LDR", group: "Identity" },
  { name: "region", label: "Region", group: "Location" },
  { name: "vm_location", label: "VM Location", group: "Location" },
  { name: "site_address", label: "Site Address", group: "Location" },
  { name: "market", label: "Market (TAG)", group: "Location" },
  { name: "subscription", label: "Subscription", group: "Location" },
  { name: "vcenter_scvmm", label: "Vcenter / SCVMM", group: "Location" },
  { name: "cluster_name", label: "Cluster Name", group: "Location" },
  { name: "environment", label: "Environment (TAG)", group: "Service" },
  { name: "sla", label: "SLA (TAG)", group: "Service" },
  { name: "app_id", label: "APP ID", group: "Service" },
  { name: "application_name", label: "Application Name (TAG)", group: "Service" },
  { name: "application_details", label: "Application Details", group: "Service" },
  { name: "business_functions", label: "Business Functions (TAG)", group: "Service" },
  { name: "sap_sid", label: "SAP SID (TAG)", group: "Service" },
  { name: "sap_nonsap", label: "SAP / NonSAP", group: "Service" },
  { name: "cone_class", label: "C-one / Non-C-one", group: "Service" },
  { name: "iit_ot", label: "IIT / OT", group: "Service" },
  { name: "gcc_managed", label: "GCC Managed", group: "Ownership" },
  { name: "technical_owner", label: "Technical Owner", group: "Ownership" },
  { name: "support_team", label: "Support Team", group: "Ownership" },
  { name: "commission_ritm", label: "Commission RITM / Change", group: "Ownership" },
  { name: "ip_address", label: "IP Address", group: "Hardware" },
  { name: "vm_size", label: "VM Size", group: "Hardware" },
  { name: "data_disk", label: "Data Disk", group: "Hardware" },
  { name: "ilo", label: "ILO", group: "Hardware" },
  { name: "cluster_type", label: "Clustered / Standalone", group: "Hardware" },
  { name: "database_type", label: "Database Type", group: "Platform" },
  { name: "operating_system", label: "Operating System", group: "Platform" },
  { name: "os_type", label: "OS Type", group: "Platform" },
  { name: "os_lifecycle", label: "OS Lifecycle", group: "Lifecycle" },
  { name: "support_cycle", label: "Support Cycle", group: "Lifecycle" },
  { name: "eol_date", label: "EOL Date", group: "Lifecycle", date: true },
  ...ESU_FIELDS,
  { name: "compatible_version", label: "Compatible Version", group: "Lifecycle" },
  { name: "version_lock_enabled", label: "Version Lock Enabled", group: "Lifecycle" },
  { name: "deployment_date", label: "Deployment Date", group: "Lifecycle", date: true },
  { name: "azure_deployment_year", label: "Azure Deployment Year (TAG)", group: "Lifecycle" },
  { name: "maintenance_schedule", label: "Maintenance Schedule", group: "Operations" },
  { name: "backup_status", label: "Backup Status", group: "Operations" },
  { name: "tags_updated", label: "TAGs Updated", group: "Operations" },
  { name: "remarks", label: "Remarks", group: "Operations" },
  ...SNOOZE_EXCLUSION_FIELDS,
];

export const INSTANCE_FIELDS: FieldDef[] = [
  { name: "server_name", label: "Server Name", group: "Identity" },
  { name: "instance_name", label: "Instance Name", group: "Identity" },
  { name: "fqdn", label: "FQDN", group: "Identity" },
  { name: "server_ip", label: "Server IP", group: "Identity" },
  { name: "server_state", label: "Server State", group: "Identity", options: STATUS_OPTIONS },
  { name: "server_type", label: "Server Type", group: "Identity" },
  { name: "region", label: "Region", group: "Location" },
  { name: "location", label: "Location", group: "Location" },
  { name: "manufacturer_model", label: "Manufacturer & Model", group: "Location" },
  { name: "metal_class_of_service", label: "Metal Class of Service", group: "Location" },
  { name: "vcenter_scvmm", label: "Vcenter / SCVMM", group: "Location" },
  { name: "cluster_name", label: "Cluster Name", group: "Location" },
  { name: "app_id", label: "APP ID", group: "Service" },
  { name: "application_name", label: "Application Name", group: "Service" },
  { name: "environment", label: "Environment", group: "Service" },
  { name: "sap_nonsap", label: "SAP / NonSAP", group: "Service" },
  { name: "gcc_managed", label: "GCC Managed", group: "Ownership" },
  { name: "service_owner", label: "Service Owner", group: "Ownership" },
  { name: "sysadmin", label: "SysAdmin", group: "Ownership" },
  { name: "rdp", label: "RDP", group: "Ownership" },
  { name: "sa", label: "sa Account", group: "Ownership" },
  { name: "sql_version", label: "SQL Version", group: "Platform" },
  { name: "build", label: "Build", group: "Platform" },
  { name: "edition", label: "Edition", group: "Platform" },
  { name: "sql_port", label: "SQL Port", group: "Platform" },
  { name: "operating_system", label: "Operating System", group: "Platform" },
  { name: "database_feature", label: "Database Feature", group: "Platform" },
  { name: "database_web_features", label: "Database / Web Features", group: "Platform" },
  { name: "always_on", label: "Always On", group: "Platform" },
  { name: "cluster_listener_name", label: "Cluster / Listener Name", group: "Platform" },
  { name: "cpu_count", label: "CPU Count", group: "Capacity" },
  { name: "core_count", label: "Core Count", group: "Capacity" },
  { name: "memory_gb", label: "Memory (GB)", group: "Capacity" },
  { name: "dba_lifecycle", label: "DBA Lifecycle", group: "Lifecycle" },
  { name: "support_cycle", label: "Support Cycle", group: "Lifecycle" },
  { name: "eol_date", label: "EOL Date", group: "Lifecycle", date: true },
  ...ESU_FIELDS,
  { name: "backup_location", label: "Backup Location", group: "Operations" },
  { name: "full_backups", label: "Full Backups", group: "Operations" },
  { name: "diff_backups", label: "Diff Backups", group: "Operations" },
  { name: "log_backups", label: "Log Backups", group: "Operations" },
  { name: "backup_tool", label: "Backup Tool", group: "Operations" },
  { name: "critical_jobs", label: "Critical Jobs", group: "Operations" },
  { name: "checkdb", label: "CheckDB", group: "Operations" },
  { name: "index_job", label: "Index Job", group: "Operations" },
  { name: "stats_update", label: "Stats Update", group: "Operations" },
  { name: "windows_patching_schedule", label: "Windows Patching Schedule", group: "Operations" },
  { name: "monitoring", label: "Monitoring", group: "Operations" },
  { name: "sql_service_account", label: "SQL Server Service Account", group: "Accounts" },
  { name: "sql_agent_service_account", label: "SQL Agent Service Account", group: "Accounts" },
  ...SNOOZE_EXCLUSION_FIELDS,
];

export const SWITCH_FIELDS: FieldDef[] = [
  { name: "hostname", label: "Hostname", group: "Identity" },
  { name: "switch_role", label: "Switch Role", group: "Identity" },
  { name: "status", label: "Status", group: "Identity" },
  { name: "management_ip", label: "Management IP", group: "Identity" },
  { name: "region", label: "Region", group: "Location" },
  { name: "vm_location", label: "Location", group: "Location" },
  { name: "site_address", label: "Site Address", group: "Location" },
  { name: "environment", label: "Environment", group: "Service" },
  { name: "sla", label: "SLA", group: "Service" },
  { name: "app_id", label: "APP ID", group: "Service" },
  { name: "application_name", label: "Application Name", group: "Service" },
  { name: "business_functions", label: "Business Functions", group: "Service" },
  { name: "iit_ot", label: "IIT / OT", group: "Service" },
  { name: "gcc_managed", label: "GCC Managed", group: "Ownership" },
  { name: "technical_owner", label: "Technical Owner", group: "Ownership" },
  { name: "support_team", label: "Support Team", group: "Ownership" },
  { name: "commission_ritm", label: "Commission RITM / Change", group: "Ownership" },
  { name: "manufacturer", label: "Manufacturer", group: "Hardware" },
  { name: "model", label: "Model", group: "Hardware" },
  { name: "serial_number", label: "Serial Number", group: "Hardware" },
  { name: "port_count", label: "Port Count", group: "Hardware" },
  { name: "poe_capable", label: "PoE Capable", group: "Hardware" },
  { name: "stack_name", label: "Stack Name", group: "Hardware" },
  { name: "stack_member_count", label: "Stack Members", group: "Hardware" },
  { name: "firmware_version", label: "Firmware Version", group: "Network" },
  { name: "uplink_device", label: "Uplink Device", group: "Network" },
  { name: "uplink_port", label: "Uplink Port", group: "Network" },
  { name: "management_vlan", label: "Management VLAN", group: "Network" },
  { name: "vlan_count", label: "VLAN Count", group: "Network" },
  { name: "ip_gateway", label: "IP Gateway", group: "Network" },
  { name: "snmp_version", label: "SNMP Version", group: "Network" },
  { name: "os_lifecycle", label: "OS Lifecycle", group: "Lifecycle" },
  { name: "support_cycle", label: "Support Cycle", group: "Lifecycle" },
  { name: "eol_date", label: "EOL Date", group: "Lifecycle", date: true },
  ...ESU_FIELDS,
  { name: "deployment_date", label: "Deployment Date", group: "Lifecycle", date: true },
  { name: "maintenance_schedule", label: "Maintenance Schedule", group: "Operations" },
  { name: "backup_status", label: "Config Backup Status", group: "Operations" },
  { name: "monitoring", label: "Monitoring", group: "Operations" },
  { name: "remarks", label: "Remarks", group: "Operations" },
  ...SNOOZE_EXCLUSION_FIELDS,
];

export const WAP_FIELDS: FieldDef[] = [
  { name: "ap_name", label: "AP Name", group: "Identity" },
  { name: "status", label: "Status", group: "Identity" },
  { name: "management_ip", label: "Management IP", group: "Identity" },
  { name: "mac_address", label: "MAC Address", group: "Identity" },
  { name: "region", label: "Region", group: "Location" },
  { name: "vm_location", label: "Location", group: "Location" },
  { name: "floor_zone", label: "Floor / Zone", group: "Location" },
  { name: "site_address", label: "Site Address", group: "Location" },
  { name: "environment", label: "Environment", group: "Service" },
  { name: "sla", label: "SLA", group: "Service" },
  { name: "app_id", label: "APP ID", group: "Service" },
  { name: "application_name", label: "Application Name", group: "Service" },
  { name: "business_functions", label: "Business Functions", group: "Service" },
  { name: "iit_ot", label: "IIT / OT", group: "Service" },
  { name: "gcc_managed", label: "GCC Managed", group: "Ownership" },
  { name: "technical_owner", label: "Technical Owner", group: "Ownership" },
  { name: "support_team", label: "Support Team", group: "Ownership" },
  { name: "commission_ritm", label: "Commission RITM / Change", group: "Ownership" },
  { name: "manufacturer", label: "Manufacturer", group: "Hardware" },
  { name: "model", label: "Model", group: "Hardware" },
  { name: "serial_number", label: "Serial Number", group: "Hardware" },
  { name: "firmware_version", label: "Firmware Version", group: "Hardware" },
  { name: "controller_name", label: "Controller", group: "Wireless" },
  { name: "controller_ip", label: "Controller IP", group: "Wireless" },
  { name: "ssid_list", label: "SSIDs", group: "Wireless" },
  { name: "radio_bands", label: "Radio Bands", group: "Wireless" },
  { name: "wifi_standard", label: "Wi-Fi Standard", group: "Wireless" },
  { name: "channel_width", label: "Channel Width", group: "Wireless" },
  { name: "tx_power", label: "TX Power", group: "Wireless" },
  { name: "client_capacity", label: "Client Capacity", group: "Wireless" },
  { name: "poe_switch", label: "PoE Switch", group: "Network" },
  { name: "poe_port", label: "PoE Port", group: "Network" },
  { name: "management_vlan", label: "Management VLAN", group: "Network" },
  { name: "os_lifecycle", label: "Firmware Lifecycle", group: "Lifecycle" },
  { name: "support_cycle", label: "Support Cycle", group: "Lifecycle" },
  { name: "eol_date", label: "EOL Date", group: "Lifecycle", date: true },
  ...ESU_FIELDS,
  { name: "deployment_date", label: "Deployment Date", group: "Lifecycle", date: true },
  { name: "maintenance_schedule", label: "Maintenance Schedule", group: "Operations" },
  { name: "monitoring", label: "Monitoring", group: "Operations" },
  { name: "remarks", label: "Remarks", group: "Operations" },
  ...SNOOZE_EXCLUSION_FIELDS,
];

export const CI_CLASSES = {
  cmdb_ci_server: {
    table: "cmdb_ci_server" as const,
    label: "Servers",
    fields: SERVER_FIELDS,
    display: "hostname",
    path: "/servers",
  },
  cmdb_ci_db_mssql_instance: {
    table: "cmdb_ci_db_mssql_instance" as const,
    label: "SQL Instances",
    fields: INSTANCE_FIELDS,
    display: "server_name",
    path: "/databases",
  },
  cmdb_ci_netgear_switch: {
    table: "cmdb_ci_netgear_switch" as const,
    label: "Network Switches",
    fields: SWITCH_FIELDS,
    display: "hostname",
    path: "/switches",
  },
  cmdb_ci_wap: {
    table: "cmdb_ci_wap" as const,
    label: "Access Points",
    fields: WAP_FIELDS,
    display: "ap_name",
    path: "/access-points",
  },
};

export const SYS_FIELDS = ["sys_id", "sys_class_name", "sys_created_on", "sys_updated_on"];

/** Columns stored as integers in Postgres — forms must submit numbers. */
export const NUMERIC_FIELDS = new Set([
  "sql_port",
  "cpu_count",
  "core_count",
  "memory_gb",
  "port_count",
  "stack_member_count",
  "vlan_count",
  "client_capacity",
]);

export function groupFields(fields: FieldDef[]) {
  const groups: { group: string; fields: FieldDef[] }[] = [];
  for (const f of fields) {
    let g = groups.find((x) => x.group === f.group);
    if (!g) {
      g = { group: f.group, fields: [] };
      groups.push(g);
    }
    g.fields.push(f);
  }
  return groups;
}