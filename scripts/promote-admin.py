#!/usr/bin/env python3
"""
Promote an existing CB Assets account to administrator.

Usage (on the VM, from /opt/cb-assets):

    python3 scripts/promote-admin.py --email you@example.com \
        --dsn postgresql://postgres@localhost:5432/cmdb

Options:
    --list      show all accounts and their roles, then exit
    --revoke    remove the admin role instead of granting it

The password is taken from PGPASSWORD, deploy/selfhost/.env, or a hidden
prompt — never put it in --dsn. The account must already exist (created on
the Users & Access page or through sign-in).
"""

from __future__ import annotations

import sys

if sys.version_info < (3, 8):
    sys.exit("Python 3.8+ is required. Run with: python3 scripts/promote-admin.py")

import argparse
import getpass
import os
import re
import subprocess


def resolve_password(dsn: str) -> tuple[str, str]:
    password = os.environ.get("PGPASSWORD", "")
    match = re.match(r"^(postgres(?:ql)?://[^:/@]+):([^@]*)@(.*)$", dsn)
    if match:
        dsn = f"{match.group(1)}@{match.group(3)}"
        password = password or match.group(2)
    if not password:
        env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "deploy", "selfhost", ".env")
        if os.path.isfile(env_file) and os.access(env_file, os.R_OK):
            values = {}
            with open(env_file) as fh:
                for line in fh:
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        values[k] = v.strip().strip("'\"")
            password = values.get("POSTGRES_PASSWORD") or values.get("DB_PASSWORD") or ""
            if password:
                print("Using the database password from deploy/selfhost/.env")
    if not password:
        password = getpass.getpass("Database password: ")
    return dsn, password


def psql(dsn: str, password: str, sql: str, variables: dict[str, str]) -> subprocess.CompletedProcess:
    cmd = ["psql", dsn, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-A", "-t", "-F", " | "]
    for k, v in variables.items():
        cmd += ["-v", f"{k}={v}"]
    env = dict(os.environ, PGPASSWORD=password)
    # SQL goes via stdin so psql interpolates :'email' safely (quoted literal).
    return subprocess.run(cmd, input=sql, text=True, capture_output=True, env=env, check=False)


LIST_SQL = """
SELECT u.email, coalesce(string_agg(r.role::text, ',' ORDER BY r.role), '(none)')
FROM auth.users u LEFT JOIN public.user_roles r ON r.user_id = u.id
GROUP BY u.email ORDER BY u.email;
"""

GRANT_SQL = """
BEGIN;
SELECT id FROM auth.users WHERE lower(email) = lower(:'email') \\gset
INSERT INTO public.user_roles (user_id, role) VALUES (:'id', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
COMMIT;
"""

REVOKE_SQL = """
BEGIN;
SELECT id FROM auth.users WHERE lower(email) = lower(:'email') \\gset
DELETE FROM public.user_roles WHERE user_id = :'id' AND role = 'admin';
COMMIT;
"""

EXISTS_SQL = "SELECT count(*) FROM auth.users WHERE lower(email) = lower(:'email');"


def main() -> int:
    p = argparse.ArgumentParser(description="Promote a CB Assets account to administrator")
    p.add_argument("--email", help="email of the account to promote")
    p.add_argument("--dsn", default=os.environ.get("DATABASE_URL", "postgresql://postgres@127.0.0.1:5432/cmdb"),
                   help="PostgreSQL connection string WITHOUT password (default: local bundled database)")
    p.add_argument("--list", action="store_true", help="list accounts and roles")
    p.add_argument("--revoke", action="store_true", help="remove the admin role instead")
    args = p.parse_args()

    if not args.list and not args.email:
        p.error("--email is required (or use --list)")

    dsn, password = resolve_password(args.dsn)

    if args.list:
        r = psql(dsn, password, LIST_SQL, {})
        if r.returncode != 0:
            print(r.stderr.strip(), file=sys.stderr)
            return r.returncode
        print("email | roles")
        print(r.stdout.strip() or "(no accounts)")
        return 0

    r = psql(dsn, password, EXISTS_SQL, {"email": args.email})
    if r.returncode != 0:
        print(r.stderr.strip(), file=sys.stderr)
        return r.returncode
    if r.stdout.strip() != "1":
        print(f"No account found for {args.email}. Create it first, or run with --list.", file=sys.stderr)
        return 1

    r = psql(dsn, password, REVOKE_SQL if args.revoke else GRANT_SQL, {"email": args.email})
    if r.returncode != 0:
        print(r.stderr.strip(), file=sys.stderr)
        return r.returncode

    action = "is no longer an administrator" if args.revoke else "is now an administrator"
    print(f"{args.email} {action}. They should sign out and back in to see the change.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
