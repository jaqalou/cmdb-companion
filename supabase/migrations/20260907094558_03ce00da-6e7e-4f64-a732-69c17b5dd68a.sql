ALTER TABLE public.cmdb_ci_server ADD COLUMN IF NOT EXISTS snoozed boolean NOT NULL DEFAULT false;
ALTER TABLE public.cmdb_ci_db_mssql_instance ADD COLUMN IF NOT EXISTS snoozed boolean NOT NULL DEFAULT false;
ALTER TABLE public.cmdb_ci_netgear_switch ADD COLUMN IF NOT EXISTS snoozed boolean NOT NULL DEFAULT false;
ALTER TABLE public.cmdb_ci_wap ADD COLUMN IF NOT EXISTS snoozed boolean NOT NULL DEFAULT false;