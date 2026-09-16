#!/usr/bin/env python3
"""Configure the CB Assets tables in an existing PostgreSQL database.

Applies, in order and only once each:

  1. deploy/selfhost/sql/00-bootstrap.sql  (roles, auth schema, helper functions)
  2. every file in supabase/migrations/*.sql (tables, RLS, triggers, seed data)

Progress is recorded in public.applied_migrations, so re-running is safe.

Usage
-----
    python3 deploy/apply-schema.py \
        --host db.internal --port 5432 --dbname cmdb \
        --user postgres --password 'secret' \
        --role-password 'password-for-service-roles'

Credentials may also come from the environment (DB_HOST, DB_PORT, DB_NAME,
DB_USER, DB_PASSWORD) or, with --env-file, from deploy/selfhost/.env.
Without --password the script prompts for it.

The account used must be able to create roles, schemas and extensions
(a superuser, or the database owner with rolcreaterole).

Requires the `psql` client (apt install postgresql-client) or, with
--docker, runs psql from the postgres:16-alpine image instead.
"""
from __future__ import annotations

import argparse
import getpass
import os
import subprocess
import sys
from pathlib import Path

if sys.version_info < (3, 8):
    sys.exit(
        "CB Assets requires Python 3.8 or newer, but you are running "
        f"{sys.version.split()[0]}.\n"
        "Run this script with 'python3' explicitly, e.g.:\n"
        "    python3 deploy/apply-schema.py --host db.internal ...\n"
        "If 'python3 --version' also reports an old version, install a newer\n"
        "Python first:  sudo apt install python3 python3-venv python3-pip"
    )

REPO = Path(__file__).resolve().parents[1]
BOOTSTRAP = REPO / "deploy" / "selfhost" / "sql" / "00-bootstrap.sql"
MIGRATIONS = REPO / "supabase" / "migrations"
ENV_FILE = REPO / "deploy" / "selfhost" / ".env"


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip()
    return values


class Psql:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args

    def _cmd(self) -> list[str]:
        base = [
            "psql", "-v", "ON_ERROR_STOP=1", "-X",
            "-h", self.args.host, "-p", str(self.args.port),
            "-U", self.args.user, "-d", self.args.dbname,
        ]
        if self.args.docker:
            return [
                "docker", "run", "--rm", "-i", "--network", "host",
                "-e", f"PGPASSWORD={self.args.password}",
                "postgres:16-alpine", *base,
            ]
        return base

    def _env(self) -> dict[str, str]:
        env = dict(os.environ)
        env["PGPASSWORD"] = self.args.password
        return env

    def run(self, *extra: str, stdin: str | None = None, capture: bool = False):
        proc = subprocess.run(
            [*self._cmd(), *extra],
            input=stdin,
            text=True,
            env=self._env(),
            capture_output=capture,
        )
        if proc.returncode != 0:
            if capture and proc.stderr:
                print(proc.stderr, file=sys.stderr)
            raise SystemExit(f"psql failed (exit {proc.returncode})")
        return (proc.stdout or "").strip() if capture else ""

    def scalar(self, sql: str) -> str:
        return self.run("-tAc", sql, capture=True)

    def file(self, path: Path, *extra: str) -> None:
        self.run(*extra, "-f", "-", stdin=path.read_text())


def parse_args() -> argparse.Namespace:
    env = dict(os.environ)
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--env-file", action="store_true", help=f"read defaults from {ENV_FILE}")
    p.add_argument("--host", default=env.get("DB_HOST"))
    p.add_argument("--port", default=env.get("DB_PORT", "5432"))
    p.add_argument("--dbname", default=env.get("DB_NAME", "postgres"))
    p.add_argument("--user", default=env.get("DB_USER", "postgres"))
    p.add_argument("--password", default=env.get("DB_PASSWORD"))
    p.add_argument(
        "--role-password",
        default=env.get("ROLE_PASSWORD"),
        help="password given to the authenticator / auth admin roles (defaults to --password)",
    )
    p.add_argument("--docker", action="store_true", help="run psql from the postgres:16-alpine image")
    p.add_argument("--dry-run", action="store_true", help="list what would be applied and exit")
    args = p.parse_args()

    if args.env_file:
        values = read_env_file(ENV_FILE)
        args.host = args.host or values.get("DB_HOST")
        args.port = args.port or values.get("DB_PORT", "5432")
        args.dbname = args.dbname or values.get("DB_NAME", "postgres")
        args.user = args.user or values.get("DB_USER", "postgres")
        args.password = args.password or values.get("DB_PASSWORD")

    if not args.host:
        args.host = input("PostgreSQL host: ").strip()
    if not args.password:
        args.password = getpass.getpass(f"Password for {args.user}@{args.host}: ")
    args.role_password = args.role_password or args.password
    return args


def main() -> int:
    args = parse_args()
    files = sorted(MIGRATIONS.glob("*.sql"))

    if args.dry_run:
        print(f"Target : {args.user}@{args.host}:{args.port}/{args.dbname}")
        print(f"Bootstrap: {BOOTSTRAP.relative_to(REPO)}")
        for f in files:
            print(f"Migration: {f.relative_to(REPO)}")
        return 0

    db = Psql(args)
    print(f"==> Connecting to {args.host}:{args.port}/{args.dbname}")
    db.scalar("select 1")

    print("==> Roles, auth schema and helper functions")
    db.file(BOOTSTRAP, "-v", f"db_password={args.role_password}")

    db.run("-c", "CREATE TABLE IF NOT EXISTS public.applied_migrations ("
                 "filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());")

    print("==> Application schema")
    for f in files:
        done = db.scalar(f"SELECT 1 FROM public.applied_migrations WHERE filename = '{f.name}'")
        if done == "1":
            continue
        print(f"  - {f.name}")
        db.file(f)
        db.run("-c", f"INSERT INTO public.applied_migrations (filename) VALUES ('{f.name}')")

    db.run("-c", "NOTIFY pgrst, 'reload schema'")
    print("\nDone. The CB Assets tables are configured in this database.")
    print("Note: the accounts service (GoTrue) creates the auth.users tables on first start.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
