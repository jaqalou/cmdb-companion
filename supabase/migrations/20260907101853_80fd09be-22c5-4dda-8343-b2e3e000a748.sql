-- Convert role-check helpers from SECURITY DEFINER to SECURITY INVOKER so they
-- execute with the caller's privileges. user_roles already grants SELECT to
-- authenticated, and RLS policies on user_roles control which rows are visible.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','editor')
  )
$$;

-- Ensure signed-in users can read the roles table so the invoker functions work.
GRANT SELECT ON public.user_roles TO authenticated;

-- Any signed-in user must be able to check their own roles for the UI/policies to work.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
      AND policyname = 'Users can read their own roles'
  ) THEN
    CREATE POLICY "Users can read their own roles"
      ON public.user_roles FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;