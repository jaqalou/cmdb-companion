ALTER TABLE public.cmdb_ci_server
  ADD COLUMN IF NOT EXISTS snooze_exclusion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_start_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_end_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_reason text;

ALTER TABLE public.cmdb_ci_db_mssql_instance
  ADD COLUMN IF NOT EXISTS snooze_exclusion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_start_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_end_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_reason text;

ALTER TABLE public.cmdb_ci_netgear_switch
  ADD COLUMN IF NOT EXISTS snooze_exclusion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_start_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_end_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_reason text;

ALTER TABLE public.cmdb_ci_wap
  ADD COLUMN IF NOT EXISTS snooze_exclusion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_start_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_end_date text,
  ADD COLUMN IF NOT EXISTS snooze_exclusion_reason text;