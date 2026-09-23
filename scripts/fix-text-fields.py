#!/usr/bin/env python3
"""Convert the SQL instance 'SQL Port' and 'Memory (GB)' columns to free text.

Run this once against an existing CB Assets database so those two fields accept
any text (for example "1433, 1434" or "128 GB") instead of whole numbers only.

Usage
-----
    python3 scripts/fix-text-fields.py \
        --dsn postgresql://postgres@localhost:5432/cmdb

Never put the password inside the --dsn value — it would be saved in your
shell history. The script reads it from deploy/selfhost/.env
(POSTGRES_PASSWORD or DB_PASSWORD) automatically, from the PGPASSWORD
environment variable, or prompts for it without echoing.
Re-running is safe: columns that are already text are left untouched.
Requires the psql client (sudo apt install postgresql-client).
"""
from __future__ import annotations

import argparse
import getpass
import os
import re
import subprocess
import sys

TABLE = "public.cmdb_ci_db_mssql_instance"
COLUMNS = ["sql_port", "memory_gb"]

SQL = """
DO $$
DECLARE
  col text;
  kind text;
BEGIN
  FOREACH col IN ARRAY ARRAY[{cols}] LOOP
    SELECT data_type INTO kind
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'cmdb_ci_db_mssql_instance'
       AND column_name = col;
    IF kind IS NULL THEN
      RAISE NOTICE 'column % not present, skipping', col;
    ELSIF kind = 'text' THEN
      RAISE NOTICE 'column % is already text', col;
    ELSE
      EXECUTE format(
        'ALTER TABLE {table} ALTER COLUMN %I TYPE text USING %I::text', col, col);
      RAISE NOTICE 'column % converted to text', col;
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
""".format(table=TABLE, cols=", ".join(f"'{c}'" for c in COLUMNS))


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--dsn",
        default=os.environ.get("DATABASE_URL"),
        required="DATABASE_URL" not in os.environ,
        help="postgresql://user@host:port/dbname — WITHOUT the password",
    )
    p.add_argument("--dry-run", action="store_true", help="print the SQL and exit")
    args = p.parse_args()

    if args.dry_run:
        print(SQL)
        return 0

    # Keep the password out of the command line (and shell history): take it
    # from PGPASSWORD, deploy/selfhost/.env, or an interactive prompt, and
    # hand it to psql through the environment instead of the DSN.
    dsn, password = args.dsn, os.environ.get("PGPASSWORD", "")
    match = re.match(r"^(postgres(?:ql)?://[^:]+):([^@]*)@(.*)$", dsn)
    if match:
        dsn = f"{match.group(1)}@{match.group(3)}"
        if not password:
            password = match.group(2)
    if not password:
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
    if not password:
        password = getpass.getpass("Database password: ")

    env = dict(os.environ)
    env["PGPASSWORD"] = password
    proc = subprocess.run(
        ["psql", "-v", "ON_ERROR_STOP=1", "-X", "-d", dsn, "-f", "-"],
        input=SQL,
        text=True,
        env=env,
    )
    if proc.returncode != 0:
        print("Failed to update the columns.", file=sys.stderr)
        return proc.returncode
    print("\nDone. SQL Port and Memory (GB) now accept any text.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
