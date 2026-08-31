GRANT SELECT ON public.cmdb_ci_server TO anon;
GRANT SELECT ON public.cmdb_ci_db_mssql_instance TO anon;
GRANT SELECT ON public.cmdb_ci_netgear_switch TO anon;
GRANT SELECT ON public.cmdb_ci_wap TO anon;

DROP POLICY IF EXISTS "cmdb_server_public_read" ON public.cmdb_ci_server;
CREATE POLICY "cmdb_server_public_read" ON public.cmdb_ci_server FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "cmdb_mssql_public_read" ON public.cmdb_ci_db_mssql_instance;
CREATE POLICY "cmdb_mssql_public_read" ON public.cmdb_ci_db_mssql_instance FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "cmdb_switch_public_read" ON public.cmdb_ci_netgear_switch;
CREATE POLICY "cmdb_switch_public_read" ON public.cmdb_ci_netgear_switch FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "cmdb_wap_public_read" ON public.cmdb_ci_wap;
CREATE POLICY "cmdb_wap_public_read" ON public.cmdb_ci_wap FOR SELECT TO anon USING (true);