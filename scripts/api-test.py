#!/usr/bin/env python3
"""CB Assets API test & demo script.

Exercises both REST dialects (GLPI and ServiceNow) against a running
CB Assets instance, and creates test items in every CI class.

Usage:
    python3 api-test.py --base http://192.168.1.50 --token cba_1a2b3c4d_...

    # or with an account sign-in instead of an API token:
    python3 api-test.py --base http://192.168.1.50 --email you@example.com --password ...

Options:
    --base       Base URL of the site (e.g. http://34.60.104.14)
    --token      CB Assets API token (cba_...) — shown once at creation
    --email      Account email (alternative to --token; asks for password)
    --password   Account password (prompted when omitted)
    --cleanup    Delete the items this script created afterwards
    --only       Limit to one dialect: glpi | now (default: both)

Requires: python3 (3.8+) and `requests`  →  pip3 install requests
"""

from __future__ import annotations

import argparse
import getpass
import json
import sys
import uuid

try:
    import requests
except ImportError:
    sys.exit("Missing dependency: pip3 install requests")

TIMEOUT = 20
PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []
created: list[tuple[str, str]] = []  # (table, sys_id) for cleanup


def report(status: str, what: str, detail: str = "") -> None:
    results.append((status, what, detail))
    print(f"[{status}] {what}" + (f" — {detail}" if detail else ""))


def check(ok: bool, what: str, detail: str = "") -> bool:
    report(PASS if ok else FAIL, what, detail)
    return ok


# ---------------------------------------------------------------- auth

def sign_in(base: str, email: str, password: str) -> str:
    """Get an account access token from the built-in login service."""
    probe = requests.get(f"{base}/rest/v1/", timeout=TIMEOUT)
    apikey = probe.headers.get("apikey") or ""
    if not apikey:
        # PostgREST answers 401/400 without a key; grab it from the error path.
        apikey = probe.request.headers.get("apikey", "")
    resp = requests.post(
        f"{base}/auth/v1/token?grant_type=password",
        headers={"apikey": apikey, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=TIMEOUT,
    )
    if resp.status_code != 200 or "access_token" not in resp.text:
        sys.exit(f"Sign-in failed ({resp.status_code}): {resp.text[:200]}")
    return resp.json()["access_token"]


# ------------------------------------------------------------- helpers

def snow(session: requests.Session, base: str) -> None:
    print("\n== ServiceNow dialect (/api/public/now/table) ==")
    url = f"{base}/api/public/now/table/cmdb_ci_server"

    r = session.get(url, params={"sysparm_limit": 5}, timeout=TIMEOUT)
    rows = r.json().get("result", []) if r.status_code == 200 else []
    check(r.status_code == 200, "List servers", f"{len(rows)} rows, total {r.headers.get('X-Total-Count', '?')}")

    name = f"apitest-{uuid.uuid4().hex[:8]}"
    r = session.post(url, json={"hostname": name, "environment": "Test"}, timeout=TIMEOUT)
    ok = r.status_code in (200, 201)
    rec = r.json().get("result", {}) if ok else {}
    if check(ok, "Create server", name):
        created.append(("cmdb_ci_server", rec.get("sys_id", "")))
        sys_id = rec["sys_id"]

        r = session.get(f"{url}/{sys_id}", timeout=TIMEOUT)
        check(r.status_code == 200 and r.json().get("result", {}).get("hostname") == name, "Read it back")

        r = session.patch(f"{url}/{sys_id}", json={"environment": "Production"}, timeout=TIMEOUT)
        check(r.status_code == 200 and r.json().get("result", {}).get("environment") == "Production", "Update it")

        r = session.get(url, params={"sysparm_query": f"hostnameSTARTSWITH{name}", "sysparm_limit": 5}, timeout=TIMEOUT)
        check(r.status_code == 200 and any(x.get("sys_id") == sys_id for x in r.json().get("result", [])), "Query filter (STARTSWITH)")

        r = session.get(f"{base}/api/public/now/table/not_a_table", timeout=TIMEOUT)
        check(r.status_code == 404, "Unknown table rejected", str(r.status_code))
    else:
        report(FAIL, "Create server", f"{r.status_code} {r.text[:200]}")


def glpi(session: requests.Session, base: str) -> None:
    print("\n== GLPI dialect (/api/public/apirest.php) ==")
    url = f"{base}/api/public/apirest.php"

    r = session.get(f"{url}/initSession", timeout=TIMEOUT)
    check(r.status_code == 200 and "session_token" in r.text, "initSession")

    r = session.get(f"{url}/NetworkEquipment", params={"range": "0-4"}, timeout=TIMEOUT)
    check(r.status_code in (200, 206), "List switches", f"Content-Range {r.headers.get('Content-Range', '?')}")

    name = f"apitest-ap-{uuid.uuid4().hex[:8]}"
    r = session.post(f"{url}/AccessPoint", json={"input": {"hostname": name, "environment": "Test"}}, timeout=TIMEOUT)
    ok = r.status_code in (200, 201)
    sys_id = ""
    if ok:
        body = r.json()
        sys_id = (body[0] if isinstance(body, list) else body).get("id") or (body[0] if isinstance(body, list) else body).get("sys_id") or ""
    if check(ok and sys_id, "Create access point", name):
        created.append(("cmdb_ci_wap", sys_id))

        r = session.get(f"{url}/AccessPoint/{sys_id}", timeout=TIMEOUT)
        check(r.status_code == 200, "Read it back")

        r = session.patch(f"{url}/AccessPoint/{sys_id}", json={"input": {"environment": "Production"}}, timeout=TIMEOUT)
        check(r.status_code in (200, 201), "Update it")

        r = session.get(
            f"{url}/search/AccessPoint",
            params={
                "criteria[0][field]": "hostname",
                "criteria[0][searchtype]": "contains",
                "criteria[0][value]": "apitest-ap",
            },
            timeout=TIMEOUT,
        )
        check(r.status_code == 200, "Search (criteria contains)")

        r = session.get(f"{url}/listSearchOptions/AccessPoint", timeout=TIMEOUT)
        check(r.status_code == 200, "listSearchOptions")
    else:
        report(FAIL, "Create access point", f"{r.status_code} {r.text[:200]}")

    r = session.get(f"{url}/NotAThing", timeout=TIMEOUT)
    check(r.status_code == 404, "Unknown itemtype rejected", str(r.status_code))


def cleanup(session: requests.Session, base: str) -> None:
    print("\n== Cleanup ==")
    for table, sys_id in created:
        r = session.delete(f"{base}/api/public/now/table/{table}/{sys_id}", timeout=TIMEOUT)
        check(r.status_code in (200, 204, 404), f"Delete {table}/{sys_id}", str(r.status_code))


def main() -> None:
    ap = argparse.ArgumentParser(description="Test the CB Assets APIs and create demo items.")
    ap.add_argument("--base", required=True, help="Site address, e.g. http://192.168.1.50")
    ap.add_argument("--token", help="CB Assets API token (cba_...)")
    ap.add_argument("--email", help="Account email (alternative to --token)")
    ap.add_argument("--password", help="Account password (prompted when omitted)")
    ap.add_argument("--cleanup", action="store_true", help="Delete created items afterwards")
    ap.add_argument("--only", choices=["glpi", "now"], help="Test one dialect only")
    args = ap.parse_args()

    base = args.base.rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = "http://" + base

    if args.token:
        token = args.token
    elif args.email:
        password = args.password or getpass.getpass("Password: ")
        token = sign_in(base, args.email, password)
        report(PASS, "Signed in", args.email)
    else:
        ap.error("provide --token or --email")

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"

    r = session.get(f"{base}/api/public/health", timeout=TIMEOUT)
    check(r.status_code == 200, "Health probe", r.text[:120])
    if r.status_code != 200:
        sys.exit("API not reachable — check --base and that the services are running.")

    if args.only in (None, "now"):
        snow(session, base)
    if args.only in (None, "glpi"):
        glpi(session, base)
    if args.cleanup:
        cleanup(session, base)
    elif created:
        print("\nCreated items kept (rerun with --cleanup to remove):")
        for table, sys_id in created:
            print(f"  {table}  {sys_id}")

    failed = [w for s, w, _ in results if s == FAIL]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
