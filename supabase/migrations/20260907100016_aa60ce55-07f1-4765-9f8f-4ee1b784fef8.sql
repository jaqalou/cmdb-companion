DROP POLICY IF EXISTS "cmdb_server_public_read" ON public.cmdb_ci_server;
DROP POLICY IF EXISTS "cmdb_mssql_public_read" ON public.cmdb_ci_db_mssql_instance;
DROP POLICY IF EXISTS "cmdb_switch_public_read" ON public.cmdb_ci_netgear_switch;
DROP POLICY IF EXISTS "cmdb_wap_public_read" ON public.cmdb_ci_wap;

REVOKE ALL ON public.cmdb_ci_server FROM anon;
REVOKE ALL ON public.cmdb_ci_db_mssql_instance FROM anon;
REVOKE ALL ON public.cmdb_ci_netgear_switch FROM anon;
REVOKE ALL ON public.cmdb_ci_wap FROM anon;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_write(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_write(uuid) TO service_role;