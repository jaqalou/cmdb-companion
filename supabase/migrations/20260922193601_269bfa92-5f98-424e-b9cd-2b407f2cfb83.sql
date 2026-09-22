ALTER TABLE public.cmdb_ci_db_mssql_instance
  ALTER COLUMN sql_port TYPE text USING sql_port::text,
  ALTER COLUMN memory_gb TYPE text USING memory_gb::text;