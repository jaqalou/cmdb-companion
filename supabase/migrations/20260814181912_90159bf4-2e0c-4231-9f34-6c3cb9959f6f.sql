CREATE TABLE public.cmdb_ci_server (
  sys_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sys_class_name text NOT NULL DEFAULT 'cmdb_ci_server',
  sys_created_on timestamptz NOT NULL DEFAULT now(),
  sys_updated_on timestamptz NOT NULL DEFAULT now(),
  hostname text NOT NULL,
  region text, gcc_managed text, environment text, sla text, app_id text,
  application_name text, sap_sid text, technical_owner text, support_team text,
  appliance text, ldr text, vm_location text, type text, ip_address text,
  vm_size text, status text, data_disk text, maintenance_schedule text,
  iit_ot text, database_type text, sap_nonsap text, cluster_type text,
  operating_system text, os_type text, subscription text, virtual_hostname text,
  market text, business_functions text, cone_class text, deployment_date text,
  azure_deployment_year text, application_details text, tags_updated text,
  ilo text, site_address text, commission_ritm text, os_lifecycle text,
  support_cycle text, eol_date text, compatible_version text,
  version_lock_enabled text, backup_status text, remarks text
);

CREATE TABLE public.cmdb_ci_db_mssql_instance (
  sys_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sys_class_name text NOT NULL DEFAULT 'cmdb_ci_db_mssql_instance',
  sys_created_on timestamptz NOT NULL DEFAULT now(),
  sys_updated_on timestamptz NOT NULL DEFAULT now(),
  server_name text NOT NULL,
  region text, gcc_managed text, app_id text, instance_name text, server_ip text,
  server_state text, fqdn text, rdp text, sysadmin text, application_name text,
  sql_version text, build text, edition text, dba_lifecycle text, support_cycle text,
  eol_date text, sql_port integer, cpu_count integer, core_count integer,
  memory_gb integer, operating_system text, environment text, backup_location text,
  full_backups text, diff_backups text, log_backups text, backup_tool text,
  critical_jobs text, sa text, service_owner text, always_on text,
  database_feature text, cluster_listener_name text, sql_service_account text,
  sql_agent_service_account text, metal_class_of_service text, location text,
  manufacturer_model text, checkdb text, index_job text, stats_update text,
  windows_patching_schedule text, sap_nonsap text, server_type text,
  monitoring text, database_web_features text
);

GRANT SELECT ON public.cmdb_ci_server TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmdb_ci_server TO authenticated;
GRANT ALL ON public.cmdb_ci_server TO service_role;
GRANT SELECT ON public.cmdb_ci_db_mssql_instance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmdb_ci_db_mssql_instance TO authenticated;
GRANT ALL ON public.cmdb_ci_db_mssql_instance TO service_role;

ALTER TABLE public.cmdb_ci_server ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmdb_ci_db_mssql_instance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Servers are viewable by everyone" ON public.cmdb_ci_server FOR SELECT USING (true);
CREATE POLICY "Signed-in users can insert servers" ON public.cmdb_ci_server FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Signed-in users can update servers" ON public.cmdb_ci_server FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Signed-in users can delete servers" ON public.cmdb_ci_server FOR DELETE TO authenticated USING (true);

CREATE POLICY "Instances are viewable by everyone" ON public.cmdb_ci_db_mssql_instance FOR SELECT USING (true);
CREATE POLICY "Signed-in users can insert instances" ON public.cmdb_ci_db_mssql_instance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Signed-in users can update instances" ON public.cmdb_ci_db_mssql_instance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Signed-in users can delete instances" ON public.cmdb_ci_db_mssql_instance FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_sys_updated_on()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.sys_updated_on = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_server_updated BEFORE UPDATE ON public.cmdb_ci_server
FOR EACH ROW EXECUTE FUNCTION public.set_sys_updated_on();
CREATE TRIGGER trg_instance_updated BEFORE UPDATE ON public.cmdb_ci_db_mssql_instance
FOR EACH ROW EXECUTE FUNCTION public.set_sys_updated_on();

CREATE INDEX idx_server_hostname ON public.cmdb_ci_server (hostname);
CREATE INDEX idx_server_env ON public.cmdb_ci_server (environment);
CREATE INDEX idx_instance_server ON public.cmdb_ci_db_mssql_instance (server_name);

INSERT INTO public.cmdb_ci_server (hostname, region, gcc_managed, environment, sla, app_id, application_name, sap_sid, technical_owner, support_team, appliance, ldr, vm_location, type, ip_address, vm_size, status, data_disk, maintenance_schedule, iit_ot, database_type, sap_nonsap, cluster_type, operating_system, os_type, subscription, virtual_hostname, market, business_functions, cone_class, deployment_date, azure_deployment_year, application_details, tags_updated, ilo, site_address, commission_ritm, os_lifecycle, support_cycle, eol_date, compatible_version, version_lock_enabled, backup_status, remarks) VALUES
('EUWPRDSAP01','EMEA','Yes','Production','Gold','APP-1042','SAP ECC Core','PRD','M. Sorensen','SAP Basis','No','LDR-01','West Europe','Virtual','10.44.12.11','Standard_E32s_v5','Operational','2 x 1024 GB','Sat 02:00-06:00','IIT','HANA','SAP','Clustered','SUSE Linux Enterprise 15 SP5','Linux','sub-prod-emea','sapprd-vip','Denmark','Supply Chain','C-one','2023-04-18','2023','Core ERP for brewery operations','2026-06-01','n/a','Valby, Copenhagen','RITM0012345','Mainstream','Until 2031','2031-12-31','15 SP5','Yes','Protected','Primary ERP node'),
('EUWPRDSAP02','EMEA','Yes','Production','Gold','APP-1042','SAP ECC Core','PRD','M. Sorensen','SAP Basis','No','LDR-01','West Europe','Virtual','10.44.12.12','Standard_E32s_v5','Operational','2 x 1024 GB','Sat 02:00-06:00','IIT','HANA','SAP','Clustered','SUSE Linux Enterprise 15 SP5','Linux','sub-prod-emea','sapprd-vip','Denmark','Supply Chain','C-one','2023-04-18','2023','Core ERP for brewery operations','2026-06-01','n/a','Valby, Copenhagen','RITM0012346','Mainstream','Until 2031','2031-12-31','15 SP5','Yes','Protected','Secondary ERP node'),
('EUNPRDBRW11','EMEA','Yes','Production','Silver','APP-2210','Brewery MES','','J. Lindqvist','OT Operations','Yes','LDR-04','North Europe','Physical','10.61.4.20','HPE DL380 G10','Operational','4 x 2048 GB','Sun 01:00-05:00','OT','MSSQL','NonSAP','Standalone','Windows Server 2019','Windows','sub-prod-ot','brw-mes-vip','Sweden','Manufacturing','Non-C-one','2021-09-02','n/a','Line control and batch tracking','2026-05-12','10.61.4.220','Falkenberg Brewery','CHG0044210','Extended','Until 2029','2029-01-09','2019','No','Protected','OT segregated network'),
('USEPRDWEB03','AMER','No','Production','Bronze','APP-3301','Consumer Web Platform','','A. Ruiz','Digital Platforms','No','LDR-07','East US','Virtual','10.92.8.33','Standard_D8s_v5','Operational','1 x 256 GB','Wed 22:00-00:00','IIT','PostgreSQL','NonSAP','Clustered','Ubuntu 22.04 LTS','Linux','sub-prod-amer','web-us-vip','USA','Marketing','Non-C-one','2024-02-11','2024','Brand and e-commerce front end','2026-07-01','n/a','Milwaukee, WI','RITM0033012','Mainstream','Until 2027','2027-04-30','22.04','No','Protected','Auto-scaled behind CDN'),
('APSPRDDWH07','APAC','Yes','Production','Gold','APP-4120','Group Data Warehouse','','L. Chen','Data Engineering','No','LDR-09','Southeast Asia','Virtual','10.120.16.7','Standard_E64s_v5','Operational','6 x 4096 GB','Sat 18:00-23:00','IIT','MSSQL','NonSAP','Clustered','Windows Server 2022','Windows','sub-prod-apac','dwh-ap-vip','Singapore','Finance','C-one','2024-08-05','2024','Group reporting and analytics','2026-07-14','n/a','Singapore DC1','RITM0041288','Mainstream','Until 2032','2032-10-14','2022','Yes','Protected','Nightly ETL window'),
('EUWQASSAP21','EMEA','Yes','QA','Silver','APP-1042','SAP ECC Core','QAS','M. Sorensen','SAP Basis','No','LDR-01','West Europe','Virtual','10.45.12.21','Standard_E16s_v5','Operational','1 x 512 GB','Thu 20:00-23:00','IIT','HANA','SAP','Standalone','SUSE Linux Enterprise 15 SP5','Linux','sub-nonprod-emea','','Denmark','Supply Chain','C-one','2023-05-02','2023','QA copy of production ERP','2026-06-01','n/a','Valby, Copenhagen','RITM0012399','Mainstream','Until 2031','2031-12-31','15 SP5','Yes','Protected','Refreshed quarterly'),
('EUWDEVAPP44','EMEA','No','Development','Bronze','APP-5511','Logistics Optimiser','','P. Novak','Integration Team','No','LDR-02','West Europe','Virtual','10.46.20.44','Standard_D4s_v5','Operational','1 x 128 GB','Anytime','IIT','PostgreSQL','NonSAP','Standalone','Ubuntu 20.04 LTS','Linux','sub-nonprod-emea','','Poland','Logistics','Non-C-one','2022-11-30','2022','Route planning microservices','2026-03-18','n/a','Warsaw Office','RITM0055120','Extended','Until 2025','2025-04-30','20.04','No','Not protected','Pending OS upgrade'),
('EUNPRDINT12','EMEA','Yes','Production','Silver','APP-6002','Integration Bus','','P. Novak','Integration Team','Yes','LDR-05','North Europe','Virtual','10.62.9.12','Standard_D16s_v5','Operational','2 x 512 GB','Sun 03:00-06:00','IIT','Oracle','NonSAP','Clustered','Red Hat Enterprise Linux 9','Linux','sub-prod-emea','int-bus-vip','Norway','IT Services','C-one','2023-10-19','2023','Message broker for plant systems','2026-06-22','n/a','Oslo DC','CHG0061002','Mainstream','Until 2032','2032-05-31','9.3','Yes','Protected','High message throughput'),
('APSPRDSAP31','APAC','Yes','Production','Gold','APP-1042','SAP ECC Core','PRA','L. Chen','SAP Basis','No','LDR-09','Southeast Asia','Virtual','10.121.12.31','Standard_E48s_v5','Operational','3 x 2048 GB','Sat 19:00-23:00','IIT','HANA','SAP','Clustered','SUSE Linux Enterprise 15 SP4','Linux','sub-prod-apac','sapap-vip','Malaysia','Supply Chain','C-one','2022-06-14','2022','Regional ERP instance','2026-04-11','n/a','Kuala Lumpur DC','RITM0010211','Mainstream','Until 2030','2030-12-31','15 SP4','Yes','Protected','Regional finance close critical'),
('USEDRPWEB09','AMER','No','DR','Bronze','APP-3301','Consumer Web Platform','','A. Ruiz','Digital Platforms','No','LDR-07','West US','Virtual','10.93.8.9','Standard_D8s_v5','Decommission planned','1 x 256 GB','Wed 22:00-00:00','IIT','PostgreSQL','NonSAP','Standalone','Ubuntu 22.04 LTS','Linux','sub-dr-amer','','USA','Marketing','Non-C-one','2024-02-20','2024','Warm standby for web platform','2026-07-01','n/a','Phoenix, AZ','RITM0033090','Mainstream','Until 2027','2027-04-30','22.04','No','Protected','Replaced by multi-region setup');

INSERT INTO public.cmdb_ci_db_mssql_instance (server_name, region, gcc_managed, app_id, instance_name, server_ip, server_state, fqdn, rdp, sysadmin, application_name, sql_version, build, edition, dba_lifecycle, support_cycle, eol_date, sql_port, cpu_count, core_count, memory_gb, operating_system, environment, backup_location, full_backups, diff_backups, log_backups, backup_tool, critical_jobs, sa, service_owner, always_on, database_feature, cluster_listener_name, sql_service_account, sql_agent_service_account, metal_class_of_service, location, manufacturer_model, checkdb, index_job, stats_update, windows_patching_schedule, sap_nonsap, server_type, monitoring, database_web_features) VALUES
('APSPRDDWH07','APAC','Yes','APP-4120','MSSQLSERVER','10.120.16.7','Running','apsprddwh07.corp.local','Enabled','DBA Group','Group Data Warehouse','SQL Server 2022','16.0.4125.3','Enterprise','Mainstream','Until 2032','2032-10-14',1433,8,32,512,'Windows Server 2022','Production','backup01/dwh','Sun 20:00','Daily 02:00','Every 15 min','Commvault','ETL_Nightly_Load','Disabled','L. Chen','Yes','Columnstore, Partitioning','DWHAG-LSTN','CORP/svc_sql_dwh','CORP/svc_sqlagt_dwh','Platinum','Singapore DC1','Azure Virtual Machine','Weekly Sun','Weekly Sun','Daily','Sat 18:00-23:00','NonSAP','Database','SCOM + Grafana','Analysis Services'),
('EUNPRDBRW11','EMEA','Yes','APP-2210','BRWMES','10.61.4.20','Running','eunprdbrw11.corp.local','Restricted','OT DBA','Brewery MES','SQL Server 2019','15.0.4365.2','Standard','Extended','Until 2029','2029-01-09',1433,4,16,192,'Windows Server 2019','Production','backup04/mes','Sat 22:00','Daily 03:00','Every 30 min','Veeam','Batch_Archive','Disabled','J. Lindqvist','No','In-Memory OLTP','','CORP/svc_sql_mes','CORP/svc_sqlagt_mes','Gold','Falkenberg Brewery','HPE DL380 G10','Weekly Sat','Weekly Sat','Weekly Sat','Sun 01:00-05:00','NonSAP','Database','SCOM','Reporting Services'),
('EUWPRDFIN15','EMEA','Yes','APP-7702','FINPRD','10.44.30.15','Running','euwprdfin15.corp.local','Enabled','DBA Group','Finance Consolidation','SQL Server 2019','15.0.4365.2','Enterprise','Mainstream','Until 2030','2030-01-08',1433,8,24,384,'Windows Server 2019','Production','backup01/fin','Sun 21:00','Daily 01:00','Every 15 min','Commvault','Month_End_Close','Disabled','H. Bergman','Yes','TDE, Always Encrypted','FINAG-LSTN','CORP/svc_sql_fin','CORP/svc_sqlagt_fin','Platinum','Valby, Copenhagen','Azure Virtual Machine','Weekly Sun','Weekly Sun','Daily','Sat 02:00-06:00','NonSAP','Database','SCOM + Grafana','Integration Services'),
('USEPRDCRM22','AMER','No','APP-8801','CRMPRD','10.92.14.22','Running','useprdcrm22.corp.local','Enabled','DBA Group','Trade CRM','SQL Server 2022','16.0.4125.3','Standard','Mainstream','Until 2032','2032-10-14',1433,4,16,128,'Windows Server 2022','Production','s3://cmdb-backups/crm','Sat 23:00','Daily 04:00','Every 30 min','Native + S3','Territory_Sync','Disabled','A. Ruiz','No','Query Store','','CORP/svc_sql_crm','CORP/svc_sqlagt_crm','Gold','Milwaukee, WI','Azure Virtual Machine','Weekly Sat','Weekly Sat','Daily','Wed 22:00-00:00','NonSAP','Database','Datadog','None'),
('EUWQASFIN18','EMEA','Yes','APP-7702','FINQAS','10.45.30.18','Running','euwqasfin18.corp.local','Enabled','DBA Group','Finance Consolidation','SQL Server 2019','15.0.4335.1','Developer','Mainstream','Until 2030','2030-01-08',1433,2,8,64,'Windows Server 2019','QA','backup02/finqa','Sun 12:00','None','None','Veeam','QA_Refresh','Disabled','H. Bergman','No','TDE','','CORP/svc_sql_finqa','CORP/svc_sqlagt_finqa','Silver','Valby, Copenhagen','Azure Virtual Machine','Monthly','Monthly','Weekly','Thu 20:00-23:00','NonSAP','Database','SCOM','None'),
('APSPRDLOG27','APAC','Yes','APP-5511','LOGPRD','10.121.18.27','Running','apsprdlog27.corp.local','Enabled','DBA Group','Logistics Optimiser','SQL Server 2017','14.0.3465.1','Standard','Extended','Until 2027','2027-10-12',1433,4,12,96,'Windows Server 2016','Production','backup09/log','Sat 20:00','Daily 02:00','Every hour','Commvault','Route_Recalc','Disabled','P. Novak','No','Partitioning','','CORP/svc_sql_log','CORP/svc_sqlagt_log','Gold','Kuala Lumpur DC','Azure Virtual Machine','Weekly Sat','Weekly Sat','Weekly','Sat 19:00-23:00','NonSAP','Database','SCOM','Reporting Services'),
('EUNPRDINT12','EMEA','Yes','APP-6002','INTBUS','10.62.9.12','Running','eunprdint12.corp.local','Restricted','DBA Group','Integration Bus','SQL Server 2022','16.0.4105.2','Enterprise','Mainstream','Until 2032','2032-10-14',1433,8,16,256,'Windows Server 2022','Production','backup05/int','Sun 22:00','Daily 03:00','Every 15 min','Veeam','Queue_Housekeeping','Disabled','P. Novak','Yes','Service Broker','INTAG-LSTN','CORP/svc_sql_int','CORP/svc_sqlagt_int','Platinum','Oslo DC','Azure Virtual Machine','Weekly Sun','Weekly Sun','Daily','Sun 03:00-06:00','NonSAP','Database','SCOM + Grafana','Integration Services'),
('EUWDEVAPP44','EMEA','No','APP-5511','LOGDEV','10.46.20.44','Stopped','euwdevapp44.corp.local','Enabled','App Team','Logistics Optimiser','SQL Server 2016','13.0.6435.1','Developer','End of life','Ended 2026','2026-07-14',1433,2,4,32,'Ubuntu 20.04 LTS','Development','/backup/local','Manual','None','None','Native','None','Enabled','P. Novak','No','None','','svc_sql_dev','svc_sqlagt_dev','Bronze','Warsaw Office','Azure Virtual Machine','None','None','None','Anytime','NonSAP','Database','None','None');