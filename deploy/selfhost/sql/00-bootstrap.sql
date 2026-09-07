-- Roles, schemas and helper functions the application schema depends on.
-- Safe to run more than once.

-- Database roles used by the Data API -------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE format('CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD %L', :'db_password');
  ELSE
    EXECUTE format('ALTER ROLE authenticator LOGIN PASSWORD %L', :'db_password');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE format('CREATE ROLE supabase_auth_admin LOGIN CREATEROLE NOINHERIT PASSWORD %L', :'db_password');
  ELSE
    EXECUTE format('ALTER ROLE supabase_auth_admin LOGIN PASSWORD %L', :'db_password');
  END IF;
END $$;

GRANT anon, authenticated, service_role TO authenticator;

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, postgres;
ALTER ROLE supabase_auth_admin SET search_path = auth, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Request helpers: the same names the hosted platform exposes ---------------
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

-- The audit trigger reads emails from auth.users.
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT ON TABLES TO postgres, service_role;
