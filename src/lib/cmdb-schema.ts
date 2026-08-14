export type FieldDef = { name: string; label: string; group: string };

export const SERVER_FIELDS: FieldDef[] = [
  { name: "hostname", label: "Hostname", group: "Identity" },
  { name: "virtual_hostname", label: "Virtual Hostname", group: "Identity" },
  { name: "type", label: "Type", group: "Identity" },
  { name: "status", label: "Status", group: "Identity" },
  { name: "appliance", label: "Appliance", group: "Identity" },
  { name: "ldr", label: "LDR", group: "Identity" },
  { name: "region", label: "Region", group: "Location" },
  { name: "vm_location", label: "VM Location", group: "Location" },
  { name: "site_address", label: "Site Address", group: "Location" },
  { name: "market", label: "Market (TAG)", group: "Location" },
  { name: "subscription", label: "Subscription", group: "Location" },
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
  { name: "eol_date", label: "EOL Date", group: "Lifecycle" },
  { name: "compatible_version", label: "Compatible Version", group: "Lifecycle" },
  { name: "version_lock_enabled", label: "Version Lock Enabled", group: "Lifecycle" },
  { name: "deployment_date", label: "Deployment Date", group: "Lifecycle" },
  { name: "azure_deployment_year", label: "Azure Deployment Year (TAG)", group: "Lifecycle" },
  { name: "maintenance_schedule", label: "Maintenance Schedule", group: "Operations" },
  { name: "backup_status", label: "Backup Status", group: "Operations" },
  { name: "tags_updated", label: "TAGs Updated", group: "Operations" },
  { name: "remarks", label: "Remarks", group: "Operations" },
];

export const INSTANCE_FIELDS: FieldDef[] = [
  { name: "server_name", label: "Server Name", group: "Identity" },
  { name: "instance_name", label: "Instance Name", group: "Identity" },
  { name: "fqdn", label: "FQDN", group: "Identity" },
  { name: "server_ip", label: "Server IP", group: "Identity" },
  { name: "server_state", label: "Server State", group: "Identity" },
  { name: "server_type", label: "Server Type", group: "Identity" },
  { name: "region", label: "Region", group: "Location" },
  { name: "location", label: "Location", group: "Location" },
  { name: "manufacturer_model", label: "Manufacturer & Model", group: "Location" },
  { name: "metal_class_of_service", label: "Metal Class of Service", group: "Location" },
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
  { name: "eol_date", label: "EOL Date", group: "Lifecycle" },
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
};

export const SYS_FIELDS = ["sys_id", "sys_class_name", "sys_created_on", "sys_updated_on"];

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