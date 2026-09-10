ALTER TABLE public.cmdb_ci_server
  ADD COLUMN esu text,
  ADD COLUMN esu_start_date text,
  ADD COLUMN esu_end_date text;

ALTER TABLE public.cmdb_ci_db_mssql_instance
  ADD COLUMN esu text,
  ADD COLUMN esu_start_date text,
  ADD COLUMN esu_end_date text;

ALTER TABLE public.cmdb_ci_netgear_switch
  ADD COLUMN esu text,
  ADD COLUMN esu_start_date text,
  ADD COLUMN esu_end_date text;

ALTER TABLE public.cmdb_ci_wap
  ADD COLUMN esu text,
  ADD COLUMN esu_start_date text,
  ADD COLUMN esu_end_date text;