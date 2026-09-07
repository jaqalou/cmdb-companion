"""Dialect-agnostic CMDB data core (Flask backend).

Mirrors src/lib/cmdb-api/core.ts one-to-one: every REST dialect (GLPI today,
ServiceNow alongside it) parses its own query shape into a CoreQuery, calls
these primitives, then shapes the dialect's response envelope.

Data access goes through the PostgreSQL REST layer with the *caller's* bearer
token, so row level security is enforced by the database exactly as it is for
the TypeScript backend. No database password is needed.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import requests

PRIMARY_KEY = "sys_id"
MAX_LIMIT = 1000
TIMEOUT = 20

Row = dict[str, Any]


@dataclass
class Filter:
    field: str
    op: str
    value: str


@dataclass
class CoreQuery:
    filters: list[Filter] = field(default_factory=list)
    fields: list[str] | None = None
    sort: str | None = None
    ascending: bool = True
    offset: int = 0
    limit: int = 50


class CoreError(Exception):
    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


def _base_url() -> str:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    if not url:
        raise CoreError("SUPABASE_URL is not configured", 500)
    return url.rstrip("/") + "/rest/v1"


def _api_key() -> str:
    key = os.environ.get("SUPABASE_PUBLISHABLE_KEY") or os.environ.get(
        "VITE_SUPABASE_PUBLISHABLE_KEY"
    )
    if not key:
        raise CoreError("SUPABASE_PUBLISHABLE_KEY is not configured", 500)
    return key


def _headers(token: str | None, extra: dict[str, str] | None = None) -> dict[str, str]:
    key = _api_key()
    headers = {"apikey": key, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token if token.lower().startswith("bearer ") else f"Bearer {token}"
    headers.update(extra or {})
    return headers


def _select(fields: list[str] | None) -> str:
    return ",".join(fields) if fields else "*"


def _filter_params(filters: list[Filter]) -> list[tuple[str, str]]:
    params: list[tuple[str, str]] = []
    for f in filters:
        value = f.value or ""
        op = f.op
        if op == "eq":
            params.append((f.field, f"eq.{value}"))
        elif op == "neq":
            params.append((f.field, f"neq.{value}"))
        elif op == "startswith":
            params.append((f.field, f"ilike.{value}*"))
        elif op == "endswith":
            params.append((f.field, f"ilike.*{value}"))
        elif op in ("gt", "lt", "gte", "lte"):
            params.append((f.field, f"{op}.{value}"))
        elif op == "in":
            items = ",".join(v.strip() for v in value.split(","))
            params.append((f.field, f"in.({items})"))
        elif op == "notcontains":
            params.append((f.field, f"not.ilike.*{value}*"))
        else:  # contains and anything unknown
            params.append((f.field, f"ilike.*{value}*"))
    return params


def _request(
    method: str,
    table: str,
    token: str | None,
    *,
    params: list[tuple[str, str]] | None = None,
    json_body: Any = None,
    extra_headers: dict[str, str] | None = None,
) -> requests.Response:
    response = requests.request(
        method,
        f"{_base_url()}/{table}",
        headers=_headers(token, extra_headers),
        params=params,
        json=json_body,
        timeout=TIMEOUT,
    )
    if response.status_code >= 400:
        detail = ""
        try:
            payload = response.json()
            detail = payload.get("message") or payload.get("hint") or str(payload)
        except ValueError:
            detail = response.text
        raise CoreError(detail or "Request failed", response.status_code)
    return response


def _total_count(response: requests.Response, fallback: int) -> int:
    content_range = response.headers.get("content-range", "")
    if "/" in content_range:
        total = content_range.rsplit("/", 1)[1]
        if total.isdigit():
            return int(total)
    return fallback


def list_records(table: str, query: CoreQuery, token: str | None) -> tuple[list[Row], int]:
    limit = min(max(query.limit, 1), MAX_LIMIT)
    offset = max(query.offset, 0)
    params = [("select", _select(query.fields))]
    params += _filter_params(query.filters)
    if query.sort:
        params.append(("order", f"{query.sort}.{'asc' if query.ascending else 'desc'}"))
    headers = {
        "Prefer": "count=exact",
        "Range-Unit": "items",
        "Range": f"{offset}-{offset + limit - 1}",
    }
    response = _request("GET", table, token, params=params, extra_headers=headers)
    rows = response.json() or []
    return rows, _total_count(response, len(rows))


def get_record(table: str, record_id: str, fields: list[str] | None, token: str | None) -> Row | None:
    params = [("select", _select(fields)), (PRIMARY_KEY, f"eq.{record_id}"), ("limit", "1")]
    rows = _request("GET", table, token, params=params).json() or []
    return rows[0] if rows else None


def create_records(table: str, rows: list[Row], token: str | None) -> list[Row]:
    response = _request(
        "POST",
        table,
        token,
        json_body=rows,
        extra_headers={"Prefer": "return=representation"},
    )
    return response.json() or []


def update_record(table: str, record_id: str, patch: Row, token: str | None) -> Row | None:
    response = _request(
        "PATCH",
        table,
        token,
        params=[(PRIMARY_KEY, f"eq.{record_id}")],
        json_body=patch,
        extra_headers={"Prefer": "return=representation"},
    )
    rows = response.json() or []
    return rows[0] if rows else None


def delete_record(table: str, record_id: str, token: str | None) -> None:
    _request("DELETE", table, token, params=[(PRIMARY_KEY, f"eq.{record_id}")])


def sample_columns(table: str, token: str | None) -> list[str]:
    rows = _request("GET", table, token, params=[("select", "*"), ("limit", "1")]).json() or []
    return list(rows[0].keys()) if rows else []


def bearer_token(request) -> str | None:
    """Bearer token from either dialect's auth header (GLPI Session-Token or Authorization)."""
    session = request.headers.get("Session-Token")
    if session:
        return "Bearer " + session.split(" ", 1)[-1] if session.lower().startswith("bearer ") else f"Bearer {session}"
    auth = request.headers.get("Authorization")
    return auth or None
