REVOKE EXECUTE ON FUNCTION public.cmdb_scope_match(uuid,text,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cmdb_access_mode() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cmdb_scope_match(uuid,text,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cmdb_access_mode() TO authenticated, service_role;