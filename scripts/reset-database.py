#!/usr/bin/env python3
"""
Empty the CB Assets database for a clean start.

Removes every configuration item (servers, SQL instances, switches, access
points) and, optionally, the audit trail, API tokens and user accounts.

Usage (on the VM, from /opt/cb-assets):

    python3 scripts/reset-database.py --dsn postgresql://postgres@localhost:5432/cmdb

Never put the password inside the --dsn value — it would be saved in your
shell history. Instead do one of:

    - let the script prompt for it (it asks without echoing), or
    - export it for just this run:
        PGPASSWORD="$PASSWORD" python3 scripts/reset-database.py --dsn ...

Options:
    --items-only    only wipe the inventory (default also clears audit log +
                    API tokens)
    --all           additionally delete every user account and role, so the
                    next person to sign up becomes the administrator
    --yes           skip the confirmation prompt

The bundled-database password lives in deploy/selfhost/.env
(POSTGRES_PASSWORD / DB_PASSWORD). If no password is supplied, the script
offers to read it from there automatically.
"""

from __future__ import annotations

import argparse
import getpass
import os
import re
import subprocess
import sys

CI_TABLES = [
    "public.cmdb_ci_server",
    "public.cmdb_ci_db_mssql_instance",
    "public.cmdb_ci_netgear_switch",
    "public.cmdb_ci_wap",
]

SUPPORTING_TABLES = [
    "public.cmdb_audit_log",
    "public.api_tokens",
]

ACCOUNT_TABLES = [
    "public.user_roles",
]


def build_sql(items_only: bool, wipe_accounts: bool) -> str:
    statements: list[str] = ["BEGIN;"]
    # Audit triggers would log millions of rows for a wipe; disable per table.
    for table in CI_TABLES:
        statements.append(f"ALTER TABLE {table} DISABLE TRIGGER USER;")
        statements.append(f"DELETE FROM {table};")
        statements.append(f"ALTER TABLE {table} ENABLE TRIGGER USER;")

    if not items_only:
        for table in SUPPORTING_TABLES:
            statements.append(f"DELETE FROM {table};")

    if wipe_accounts:
        for table in ACCOUNT_TABLES:
            statements.append(f"DELETE FROM {table};")
        statements.append("DELETE FROM auth.users;")

    statements.append("COMMIT;")
    return "\n".join(statements)


def main() -> int:
    parser = argparse.ArgumentParser(description="Empty the CB Assets database")
    parser.add_argument(
        "--dsn",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL connection string WITHOUT the password (or set DATABASE_URL)",
    )
    parser.add_argument("--items-only", action="store_true", help="keep audit log and API tokens")
    parser.add_argument("--all", action="store_true", help="also delete all user accounts")
    parser.add_argument("--yes", action="store_true", help="do not ask for confirmation")
    parser.add_argument("--dry-run", action="store_true", help="print the SQL and exit")
    args = parser.parse_args()

    if not args.dsn and not args.dry_run:
        print("No connection string. Pass --dsn or set DATABASE_URL.", file=sys.stderr)
        return 2

    # Keep the password out of the command line (and shell history): take it
    # from PGPASSWORD, deploy/selfhost/.env, or an interactive prompt, and
    # hand it to psql through the environment instead of the DSN.
    dsn, password = args.dsn or "", os.environ.get("PGPASSWORD", "")
    if dsn:
        match = re.match(r"^(postgres(?:ql)?://[^:]+):([^@]*)@(.*)$", dsn)
        if match:
            dsn = f"{match.group(1)}@{match.group(3)}"
            if not password:
                password = match.group(2)
    if dsn and not password:
        env_file = os.path.join(os.path.dirname(__file__), "..", "deploy", "selfhost", ".env")
        if os.path.isfile(env_file):
            with open(env_file) as fh:
                values = dict(
                    line.split("=", 1)
                    for line in (ln.strip() for ln in fh)
                    if "=" in line and not line.startswith("#")
                )
            password = values.get("POSTGRES_PASSWORD") or values.get("DB_PASSWORD") or ""
            if password:
                print("Using the database password from deploy/selfhost/.env")
    if dsn and not password:
        password = getpass.getpass("Database password: ")

    sql = build_sql(args.items_only, args.all)

    if args.dry_run:
        print(sql)
        return 0

    scope = "all configuration items"
    if not args.items_only:
        scope += ", the audit trail and all API tokens"
    if args.all:
        scope += ", and EVERY user account"

    print(f"This permanently deletes {scope}.")
    if not args.yes:
        answer = input("Type 'erase' to continue: ").strip()
        if answer != "erase":
            print("Cancelled.")
            return 1

    env = dict(os.environ)
    if password:
        env["PGPASSWORD"] = password
    result = subprocess.run(
        ["psql", dsn, "-v", "ON_ERROR_STOP=1", "-q", "-c", sql],
        check=False,
        env=env,
    )
    if result.returncode != 0:
        print("The reset failed — nothing was changed (the whole wipe runs in one transaction).")
        return result.returncode

    print("Database emptied. You can start entering data again.")
    if args.all:
        print("The first account to sign up now becomes the administrator.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
