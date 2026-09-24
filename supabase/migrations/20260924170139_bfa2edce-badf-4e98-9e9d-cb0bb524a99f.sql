CREATE TABLE public.user_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension text NOT NULL CHECK (dimension IN ('region','environment','application_name','ci_class')),
  value text NOT NULL CHECK (length(trim(value)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dimension, value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_scopes TO authenticated;
GRANT ALL ON public.user_scopes TO service_role;
ALTER TABLE public.user_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own scopes" ON public.user_scopes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage scopes" ON public.user_scopes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.cmdb_scope_match(_uid uuid, _class text, _region text, _env text, _app text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _uid IS NULL THEN false
    WHEN public.has_role(_uid, 'admin') THEN true
    WHEN NOT EXISTS (SELECT 1 FROM public.user_scopes WHERE user_id = _uid) THEN false
    ELSE NOT EXISTS (
      SELECT 1 FROM (SELECT DISTINCT dimension FROM public.user_scopes WHERE user_id = _uid) d
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_scopes s
        WHERE s.user_id = _uid AND s.dimension = d.dimension
          AND (s.value = '*' OR lower(trim(s.value)) = lower(trim(COALESCE(
            CASE d.dimension WHEN 'region' THEN _region WHEN 'environment' THEN _env
              WHEN 'application_name' THEN _app ELSE _class END, ''))))
      )
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.cmdb_access_mode()
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN 'none'
    WHEN public.has_role(auth.uid(), 'admin') THEN 'full'
    WHEN NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN 'none'
    WHEN EXISTS (SELECT 1 FROM public.user_scopes WHERE user_id = auth.uid()) THEN 'scoped'
    ELSE 'limited'
  END
$$;

CREATE OR REPLACE FUNCTION public.cmdb_limited_list(_table text)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.cmdb_access_mode() <> 'limited' THEN RETURN; END IF;
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
REVOKE ALL ON FUNCTION public.cmdb_limited_list(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cmdb_limited_list(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Signed-in users read servers" ON public.cmdb_ci_server;
DROP POLICY IF EXISTS "Editors insert servers" ON public.cmdb_ci_server;
DROP POLICY IF EXISTS "Editors update servers" ON public.cmdb_ci_server;
CREATE POLICY "Scoped read servers" ON public.cmdb_ci_server FOR SELECT TO authenticated
  USING (public.cmdb_scope_match(auth.uid(), 'cmdb_ci_server', region, environment, application_name));
CREATE POLICY "Scoped insert servers" ON public.cmdb_ci_server FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_server', region, environment, application_name));
CREATE POLICY "Scoped update servers" ON public.cmdb_ci_server FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_server', region, environment, application_name))
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_server', region, environment, application_name));

DROP POLICY IF EXISTS "Signed-in users read instances" ON public.cmdb_ci_db_mssql_instance;
DROP POLICY IF EXISTS "Editors insert instances" ON public.cmdb_ci_db_mssql_instance;
DROP POLICY IF EXISTS "Editors update instances" ON public.cmdb_ci_db_mssql_instance;
CREATE POLICY "Scoped read instances" ON public.cmdb_ci_db_mssql_instance FOR SELECT TO authenticated
  USING (public.cmdb_scope_match(auth.uid(), 'cmdb_ci_db_mssql_instance', region, environment, application_name));
CREATE POLICY "Scoped insert instances" ON public.cmdb_ci_db_mssql_instance FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_db_mssql_instance', region, environment, application_name));
CREATE POLICY "Scoped update instances" ON public.cmdb_ci_db_mssql_instance FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_db_mssql_instance', region, environment, application_name))
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_db_mssql_instance', region, environment, application_name));

DROP POLICY IF EXISTS "Signed-in users read switches" ON public.cmdb_ci_netgear_switch;
DROP POLICY IF EXISTS "Editors insert switches" ON public.cmdb_ci_netgear_switch;
DROP POLICY IF EXISTS "Editors update switches" ON public.cmdb_ci_netgear_switch;
CREATE POLICY "Scoped read switches" ON public.cmdb_ci_netgear_switch FOR SELECT TO authenticated
  USING (public.cmdb_scope_match(auth.uid(), 'cmdb_ci_netgear_switch', region, environment, application_name));
CREATE POLICY "Scoped insert switches" ON public.cmdb_ci_netgear_switch FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_netgear_switch', region, environment, application_name));
CREATE POLICY "Scoped update switches" ON public.cmdb_ci_netgear_switch FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_netgear_switch', region, environment, application_name))
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_netgear_switch', region, environment, application_name));

DROP POLICY IF EXISTS "Signed-in users read access points" ON public.cmdb_ci_wap;
DROP POLICY IF EXISTS "Editors insert access points" ON public.cmdb_ci_wap;
DROP POLICY IF EXISTS "Editors update access points" ON public.cmdb_ci_wap;
CREATE POLICY "Scoped read access points" ON public.cmdb_ci_wap FOR SELECT TO authenticated
  USING (public.cmdb_scope_match(auth.uid(), 'cmdb_ci_wap', region, environment, application_name));
CREATE POLICY "Scoped insert access points" ON public.cmdb_ci_wap FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_wap', region, environment, application_name));
CREATE POLICY "Scoped update access points" ON public.cmdb_ci_wap FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_wap', region, environment, application_name))
  WITH CHECK (public.can_write(auth.uid()) AND public.cmdb_scope_match(auth.uid(), 'cmdb_ci_wap', region, environment, application_name));