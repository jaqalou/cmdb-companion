#!/usr/bin/env python3
"""Bulk-import CB Assets items from an XLSX workbook.

Each row in the chosen worksheet becomes one CI record. The header row holds
the CMDB field names (e.g. hostname, environment, eol_date) exactly as used by
the API, in any order. Unknown columns are reported and skipped.

Usage:
    python3 import-xlsx.py --base https://10.153.6.133 --token cba_... \
        --file inventory.xlsx --sheet Servers --type server

    # see the worksheets and the fields a type accepts, then stop
    python3 import-xlsx.py --file inventory.xlsx --list-sheets
    python3 import-xlsx.py --type switch --list-fields

Options:
    --base        Base URL of the site (e.g. https://10.153.6.133)
    --token       CB Assets API token (cba_...)
    --email       Account email (alternative to --token; password prompted)
    --password    Account password
    --file        Path to the .xlsx workbook
    --sheet       Worksheet (tab) name; defaults to the first sheet
    --type        server | sql | switch | ap  (or the cmdb table name)
    --dry-run     Validate and show what would be created, create nothing
    --skip-existing  Skip rows whose name already exists in the CMDB
    --insecure    Accept a self-signed HTTPS certificate (IP installations)

Requires: python3 3.8+; install with `sudo apt install python3-requests python3-openpyxl`
          or a venv (`python3 -m venv venv && ./venv/bin/pip install requests openpyxl`).
"""

from __future__ import annotations

import argparse
import datetime as dt
import getpass
import re
import sys

try:
    import requests
    from openpyxl import load_workbook
except ImportError:
    sys.exit(
        "Missing dependencies. Install them with one of:\n"
        "  sudo apt install python3-requests python3-openpyxl   (Ubuntu 24.04+)\n"
        "  python3 -m venv venv && ./venv/bin/pip install requests openpyxl\n"
        "  pip3 install --break-system-packages requests openpyxl   (last resort)"
    )

TIMEOUT = 30
VERIFY = True

# Mirrors src/lib/cmdb-schema.ts
TYPES = {
    "server": ("cmdb_ci_server", "hostname"),
    "sql": ("cmdb_ci_db_mssql_instance", "server_name"),
    "switch": ("cmdb_ci_netgear_switch", "hostname"),
    "ap": ("cmdb_ci_wap", "ap_name"),
}
ALIASES = {
    "cmdb_ci_server": "server",
    "computer": "server",
    "cmdb_ci_db_mssql_instance": "sql",
    "sqlinstance": "sql",
    "database": "sql",
    "cmdb_ci_netgear_switch": "switch",
    "networkequipment": "switch",
    "cmdb_ci_wap": "ap",
    "accesspoint": "ap",
    "wap": "ap",
}

BOOLEAN_FIELDS = {"snooze_exclusion", "snoozed"}
NUMERIC_FIELDS = {
    "sql_port", "cpu_count", "core_count", "memory_gb", "port_count",
    "stack_member_count", "vlan_count", "client_capacity",
}
DATE_FIELDS = {
    "esu_start_date", "esu_end_date", "eol_date", "deployment_date",
    "snooze_exclusion_start_date", "snooze_exclusion_end_date",
}
SYS_FIELDS = {"sys_id", "sys_class_name", "sys_created_on", "sys_updated_on"}


def resolve_type(name: str) -> tuple[str, str]:
    key = (name or "").strip().lower().replace(" ", "").replace("_", "")
    key = {"sqlinstance": "sql", "accesspoint": "ap"}.get(key, name.strip().lower())
    key = ALIASES.get(key, key)
    if key not in TYPES:
        sys.exit(f"Unknown --type '{name}'. Use one of: {', '.join(TYPES)}")
    return TYPES[key]


def sign_in(base: str, email: str, password: str, apikey: str) -> str:
    r = requests.post(
        f"{base}/auth/v1/token?grant_type=password",
        headers={"apikey": apikey, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=TIMEOUT, verify=VERIFY,
    )
    if r.status_code != 200 or "access_token" not in r.text:
        sys.exit(f"Sign-in failed ({r.status_code}): {r.text[:200]}")
    return r.json()["access_token"]


def norm(name: str) -> str:
    """Normalise a column header so it can be matched against CMDB fields.

    Lowercase; whitespace, line breaks, hyphens and slashes become underscores;
    punctuation such as parentheses, semicolons and question marks is dropped.
    Collapses repeated underscores. Examples:
        "Market (TAG)"            -> market_tag
        "SAP/NonSAP\nServers;"    -> sap_nonsap_servers
        "Version lock enabled\nyes/no?" -> version_lock_enabled_yes_no
    """
    s = name.strip().lower().replace("\r", " ").replace("\n", " ")
    s = re.sub(r"[\s\-/\\]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return re.sub(r"_+", "_", s).strip("_")


# Excel headers that do not match a CMDB field name after normalisation.
# Key is norm() of the Excel header, value the CMDB field it maps to.
COLUMN_ALIASES = {
    "market_tag": "market",
    "environment_tag": "environment",
    "sla_tag": "sla",
    "application_name_tag": "application_name",
    "business_functions_tag": "business_functions",
    "sap_sid_tag": "sap_sid",
    "sap_nonsap_servers": "sap_nonsap",
    "c_one_non_c_one": "cone_class",
    "commission_ritm_change": "commission_ritm",
    "ipaddress": "ip_address",
    "clustered_standalone": "cluster_type",
    "esu_reached": "esu",
    "version_lock_enabled_yes_no": "version_lock_enabled",
    "azure_deployment_year_tag": "azure_deployment_year",
}


def known_fields(session: requests.Session, base: str, table: str) -> set[str] | None:
    """Field names the table accepts, learned from an existing record."""
    r = session.get(f"{base}/api/public/now/table/{table}",
                    params={"sysparm_limit": 1}, timeout=TIMEOUT)
    if r.status_code != 200:
        return None
    rows = r.json().get("result", [])
    return set(rows[0].keys()) - SYS_FIELDS if rows else None


def coerce(field: str, raw):
    if raw is None:
        return None
    if isinstance(raw, str):
        raw = raw.strip()
        if raw == "":
            return None
    if field in BOOLEAN_FIELDS:
        if isinstance(raw, bool):
            return raw
        return str(raw).strip().lower() in {"true", "yes", "y", "1", "x"}
    if field in NUMERIC_FIELDS:
        try:
            return int(float(raw))
        except (TypeError, ValueError):
            raise ValueError(f"{field}: '{raw}' is not a number")
    if field in DATE_FIELDS:
        if isinstance(raw, (dt.datetime, dt.date)):
            return raw.strftime("%Y-%m-%d")
        text = str(raw)
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
            try:
                return dt.datetime.strptime(text, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        raise ValueError(f"{field}: '{raw}' is not a date (use yyyy-mm-dd)")
    if isinstance(raw, (dt.datetime, dt.date)):
        return raw.strftime("%Y-%m-%d")
    return str(raw)


def main() -> None:
    global VERIFY
    p = argparse.ArgumentParser(description="Import CB Assets items from XLSX")
    p.add_argument("--base")
    p.add_argument("--token")
    p.add_argument("--email")
    p.add_argument("--password")
    p.add_argument("--apikey", default="", help="Site anon key (only with --email)")
    p.add_argument("--file")
    p.add_argument("--sheet")
    p.add_argument("--type")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--skip-existing", action="store_true")
    p.add_argument("--insecure", action="store_true")
    p.add_argument("--list-sheets", action="store_true")
    p.add_argument("--list-fields", action="store_true")
    args = p.parse_args()

    if args.insecure:
        VERIFY = False
        requests.packages.urllib3.disable_warnings()  # type: ignore[attr-defined]

    if args.list_sheets:
        if not args.file:
            sys.exit("--list-sheets needs --file")
        wb = load_workbook(args.file, read_only=True)
        print("Worksheets:", ", ".join(wb.sheetnames))
        return

    if not args.file or not args.type:
        sys.exit("--file and --type are required (see --help)")
    table, display = resolve_type(args.type)

    if args.list_fields:
        if not args.base:
            sys.exit("--list-fields needs --base and credentials")

    if not args.base:
        sys.exit("--base is required")
    base = args.base.rstrip("/")

    session = requests.Session()
    session.verify = VERIFY
    if args.token:
        session.headers.update({"Authorization": f"Bearer {args.token}"})
    elif args.email:
        pw = args.password or getpass.getpass("Password: ")
        session.headers.update({"Authorization": f"Bearer {sign_in(base, args.email, pw, args.apikey)}"})
    else:
        sys.exit("Provide --token or --email")

    fields = known_fields(session, base, table)
    if args.list_fields:
        print(f"{table} fields:", ", ".join(sorted(fields)) if fields else "(no records yet — cannot infer)")
        return

    wb = load_workbook(args.file, data_only=True, read_only=True)
    sheet_name = args.sheet or wb.sheetnames[0]
    if sheet_name not in wb.sheetnames:
        match = [s for s in wb.sheetnames if s.lower() == sheet_name.lower()]
        if match:
            sheet_name = match[0]
        else:
            sys.exit(f"No tab named '{sheet_name}'. Available: {', '.join(wb.sheetnames)}")
    ws = wb[sheet_name]

    rows = ws.iter_rows(values_only=True)
    try:
        header = next(rows)
    except StopIteration:
        sys.exit("The worksheet is empty")
    raw_columns = [str(h).strip() if h is not None else "" for h in header]
    # Map headers case-insensitively ("Hostname", "HOSTNAME", "host name" → hostname)
    canon = {norm(f): f for f in fields} if fields is not None else {}
    columns = [canon.get(norm(c), norm(c)) for c in raw_columns]

    unknown = [c for c in columns if c and fields is not None and c not in fields]
    if unknown:
        print(f"Skipping unknown columns: {', '.join(unknown)}")
    if display not in columns:
        sys.exit(f"Column '{display}' is required for {table} but is not in the header row")

    existing: set[str] = set()
    if args.skip_existing:
        r = session.get(f"{base}/api/public/now/table/{table}",
                        params={"sysparm_limit": 10000, "sysparm_fields": display}, timeout=TIMEOUT)
        if r.status_code == 200:
            existing = {str(x.get(display, "")).lower() for x in r.json().get("result", [])}

    created = skipped = failed = 0
    for n, row in enumerate(rows, start=2):
        record = {}
        try:
            for col, raw in zip(columns, row):
                if not col or (fields is not None and col not in fields):
                    continue
                value = coerce(col, raw)
                if value is not None:
                    record[col] = value
        except ValueError as exc:
            print(f"[row {n}] SKIP — {exc}")
            failed += 1
            continue

        name = record.get(display)
        if not name:
            skipped += 1
            continue
        if args.skip_existing and str(name).lower() in existing:
            print(f"[row {n}] exists — {name}")
            skipped += 1
            continue
        if args.dry_run:
            print(f"[row {n}] would create {name} ({len(record)} fields)")
            created += 1
            continue

        r = session.post(f"{base}/api/public/now/table/{table}", json=record, timeout=TIMEOUT)
        if r.status_code in (200, 201):
            print(f"[row {n}] created {name}")
            created += 1
            existing.add(str(name).lower())
        else:
            print(f"[row {n}] FAILED {name} — {r.status_code}: {r.text[:200]}")
            failed += 1

    verb = "would create" if args.dry_run else "created"
    print(f"\n{verb}: {created}   skipped: {skipped}   failed: {failed}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
