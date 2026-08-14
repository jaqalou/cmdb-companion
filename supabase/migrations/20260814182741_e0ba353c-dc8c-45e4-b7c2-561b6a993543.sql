-- 1. ROLES ---------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_write(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','editor')
  )
$$;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- First signed-up user becomes admin so the platform is administrable.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

-- 2. CMDB ACCESS TIGHTENING ----------------------------------------------
DROP POLICY IF EXISTS "Servers are viewable by everyone" ON public.cmdb_ci_server;
DROP POLICY IF EXISTS "Signed-in users can insert servers" ON public.cmdb_ci_server;
DROP POLICY IF EXISTS "Signed-in users can update servers" ON public.cmdb_ci_server;
DROP POLICY IF EXISTS "Signed-in users can delete servers" ON public.cmdb_ci_server;

DROP POLICY IF EXISTS "Instances are viewable by everyone" ON public.cmdb_ci_db_mssql_instance;
DROP POLICY IF EXISTS "Signed-in users can insert instances" ON public.cmdb_ci_db_mssql_instance;
DROP POLICY IF EXISTS "Signed-in users can update instances" ON public.cmdb_ci_db_mssql_instance;
DROP POLICY IF EXISTS "Signed-in users can delete instances" ON public.cmdb_ci_db_mssql_instance;

REVOKE ALL ON public.cmdb_ci_server FROM anon;
REVOKE ALL ON public.cmdb_ci_db_mssql_instance FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmdb_ci_server TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmdb_ci_db_mssql_instance TO authenticated;
GRANT ALL ON public.cmdb_ci_server TO service_role;
GRANT ALL ON public.cmdb_ci_db_mssql_instance TO service_role;

CREATE POLICY "Signed-in users read servers"
  ON public.cmdb_ci_server FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors insert servers"
  ON public.cmdb_ci_server FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Editors update servers"
  ON public.cmdb_ci_server FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Admins delete servers"
  ON public.cmdb_ci_server FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Signed-in users read instances"
  ON public.cmdb_ci_db_mssql_instance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors insert instances"
  ON public.cmdb_ci_db_mssql_instance FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Editors update instances"
  ON public.cmdb_ci_db_mssql_instance FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Admins delete instances"
  ON public.cmdb_ci_db_mssql_instance FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. AUDIT TRAIL ----------------------------------------------------------
CREATE TABLE public.cmdb_audit_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  changed_fields text[],
  old_values jsonb,
  new_values jsonb
);

CREATE INDEX idx_audit_occurred ON public.cmdb_audit_log (occurred_at DESC);
CREATE INDEX idx_audit_record ON public.cmdb_audit_log (record_id);

GRANT SELECT ON public.cmdb_audit_log TO authenticated;
GRANT ALL ON public.cmdb_audit_log TO service_role;
ALTER TABLE public.cmdb_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.cmdb_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policies: entries are written only by the
-- SECURITY DEFINER trigger and can never be edited or erased from the app.

CREATE OR REPLACE FUNCTION public.log_cmdb_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed text[];
  actor_mail text;
BEGIN
  SELECT email INTO actor_mail FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO changed
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
  END IF;

  INSERT INTO public.cmdb_audit_log
    (actor_id, actor_email, table_name, record_id, action, changed_fields, old_values, new_values)
  VALUES (
    auth.uid(),
    actor_mail,
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW) ->> 'sys_id')::uuid, (to_jsonb(OLD) ->> 'sys_id')::uuid),
    TG_OP,
    changed,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_server
  AFTER INSERT OR UPDATE OR DELETE ON public.cmdb_ci_server
  FOR EACH ROW EXECUTE FUNCTION public.log_cmdb_change();

CREATE TRIGGER trg_audit_instance
  AFTER INSERT OR UPDATE OR DELETE ON public.cmdb_ci_db_mssql_instance
  FOR EACH ROW EXECUTE FUNCTION public.log_cmdb_change();

-- 4. GDPR RECORD OF PROCESSING -------------------------------------------
CREATE TABLE public.personal_data_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  field_name text NOT NULL,
  data_category text NOT NULL,
  lawful_basis text NOT NULL,
  purpose text NOT NULL,
  retention_period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, field_name)
);

GRANT SELECT ON public.personal_data_register TO authenticated;
GRANT ALL ON public.personal_data_register TO service_role;
ALTER TABLE public.personal_data_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read the register"
  ON public.personal_data_register FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins maintain the register"
  ON public.personal_data_register FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_register_updated
  BEFORE UPDATE ON public.personal_data_register
  FOR EACH ROW EXECUTE FUNCTION public.set_sys_updated_on();

INSERT INTO public.personal_data_register
  (table_name, field_name, data_category, lawful_basis, purpose, retention_period) VALUES
  ('cmdb_ci_server','technical_owner','Employee name / contact','Legitimate interest (Art. 6(1)(f))','Identify the accountable engineer for an asset','Duration of employment + 12 months'),
  ('cmdb_ci_server','support_team','Team / organisational unit','Legitimate interest (Art. 6(1)(f))','Route incidents to the responsible team','Life of the configuration item'),
  ('cmdb_ci_server','ip_address','Network identifier','Legitimate interest (Art. 6(1)(f))','Asset identification and incident response','Life of the configuration item + 6 months'),
  ('cmdb_ci_server','site_address','Site location','Legitimate interest (Art. 6(1)(f))','Physical asset location for field support','Life of the configuration item'),
  ('cmdb_ci_db_mssql_instance','technical_owner','Employee name / contact','Legitimate interest (Art. 6(1)(f))','Identify the accountable DBA for an instance','Duration of employment + 12 months'),
  ('cmdb_ci_db_mssql_instance','service_account','Named service credential','Legitimate interest (Art. 6(1)(f))','Operational access management and review','Life of the instance'),
  ('cmdb_audit_log','actor_email','Employee email','Legal obligation / NIS2 accountability','Attribute configuration changes to a person','24 months');

-- 5. DATA SUBJECT REQUESTS -----------------------------------------------
CREATE TABLE public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL,
  subject_identifier text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.data_subject_requests TO authenticated;
GRANT ALL ON public.data_subject_requests TO service_role;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins handle data subject requests"
  ON public.data_subject_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dsr_updated
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_sys_updated_on();