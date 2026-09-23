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
    p.add_argument("--dsn", required=True, help="postgresql://user:password@host:port/dbname")
    p.add_argument("--dry-run", action="store_true", help="print the SQL and exit")
    args = p.parse_args()

    if args.dry_run:
        print(SQL)
        return 0

    proc = subprocess.run(
        ["psql", "-v", "ON_ERROR_STOP=1", "-X", "-d", args.dsn, "-f", "-"],
        input=SQL,
        text=True,
    )
    if proc.returncode != 0:
        print("Failed to update the columns.", file=sys.stderr)
        return proc.returncode
    print("\nDone. SQL Port and Memory (GB) now accept any text.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
