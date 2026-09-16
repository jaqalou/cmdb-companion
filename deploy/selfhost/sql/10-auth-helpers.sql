-- Request helpers: the same names the hosted platform exposes.
--
-- Applied AFTER the accounts service (GoTrue) has run its own migrations, so
-- that its simpler versions of auth.uid()/auth.role() are replaced by ones
-- that read the JWT claims PostgREST provides.
--
-- The functions are owned by supabase_auth_admin so future accounts-service
-- upgrades can replace them instead of failing with "must be owner".

SET ROLE supabase_auth_admin;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT nullif(auth.jwt() ->> 'sub', '')::uuid $$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT auth.jwt() ->> 'role' $$;

CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT auth.jwt() ->> 'email' $$;

GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role(), auth.email()
  TO anon, authenticated, service_role;

RESET ROLE;
