DROP FUNCTION IF EXISTS public.cmdb_limited_list(text);
CREATE OR REPLACE FUNCTION public.cmdb_limited_list(_uid uuid, _table text)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _uid IS NULL OR public.has_role(_uid, 'admin')
     OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
     OR EXISTS (SELECT 1 FROM public.user_scopes WHERE user_id = _uid) THEN
    RETURN;
  END IF;
  IF _table = 'cmdb_ci_server' THEN
    RETURN QUERY SELECT jsonb_build_object('sys_id', sys_id, 'hostname', hostname, 'operating_system', operating_system) FROM public.cmdb_ci_server ORDER BY hostname;
  ELSIF _table = 'cmdb_ci_db_mssql_instance' THEN
    RETURN QUERY SELECT jsonb_build_object('sys_id', sys_id, 'server_name', server_name, 'operating_system', operating_system) FROM public.cmdb_ci_db_mssql_instance ORDER BY server_name;
  ELSIF _table = 'cmdb_ci_netgear_switch' THEN
    RETURN QUERY SELECT jsonb_build_object('sys_id', sys_id, 'hostname', hostname, 'firmware_version', firmware_version) FROM public.cmdb_ci_netgear_switch ORDER BY hostname;
  ELSIF _table = 'cmdb_ci_wap' THEN
    RETURN QUERY SELECT jsonb_build_object('sys_id', sys_id, 'ap_name', ap_name, 'firmware_version', firmware_version) FROM public.cmdb_ci_wap ORDER BY ap_name;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.cmdb_limited_list(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cmdb_limited_list(uuid, text) TO service_role;