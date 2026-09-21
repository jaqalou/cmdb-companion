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
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN CREATEROLE NOINHERIT;
  END IF;
END $$;

-- Passwords are set outside the DO block so psql can interpolate the variable.
ALTER ROLE authenticator PASSWORD :'db_password';
ALTER ROLE supabase_auth_admin PASSWORD :'db_password';


GRANT anon, authenticated, service_role TO authenticator;

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
-- The postgres role is absent on some existing databases (e.g. a custom
-- superuser); grant to it only when present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT USAGE ON SCHEMA auth TO postgres;
  END IF;
END $$;
ALTER ROLE supabase_auth_admin SET search_path = auth, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- The request helper functions (auth.uid/role/jwt/email) are created AFTER the
-- accounts service has run its own migrations, by sql/10-auth-helpers.sql.
-- Creating them here would make them owned by this account, and the accounts
-- service would then fail with "must be owner of function uid".

-- Allow this account to act as the auth admin (needed to own/replace the
-- helper functions afterwards).
DO $$
BEGIN
  IF NOT pg_has_role(current_user, 'supabase_auth_admin', 'MEMBER') THEN
    EXECUTE format('GRANT supabase_auth_admin TO %I', current_user);
  END IF;
END $$;

-- Repair installations made by older versions of this bootstrap. Those
-- versions created auth.uid()/auth.role() as the installation account. GoTrue
-- uses CREATE OR REPLACE for these functions during its first migration, which
-- is only allowed when supabase_auth_admin owns the existing function.
DO $$
DECLARE
  helper_name text;
BEGIN
  FOREACH helper_name IN ARRAY ARRAY['uid', 'role', 'jwt', 'email'] LOOP
    IF to_regprocedure(format('auth.%I()', helper_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER FUNCTION auth.%I() OWNER TO supabase_auth_admin',
        helper_name
      );
    END IF;
  END LOOP;
END $$;


-- The audit trigger reads emails from auth.users.
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT ON TABLES TO postgres, service_role;
