ALTER TABLE public.cmdb_ci_server
  ADD COLUMN IF NOT EXISTS vcenter_scvmm text,
  ADD COLUMN IF NOT EXISTS cluster_name text;