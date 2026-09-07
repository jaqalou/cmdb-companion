"""ServiceNow dialect — Table API over the same core as GLPI.

Enabled/disabled with API_DIALECTS in backend/cmdb/classes.py.
"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, Response, jsonify, request

from .classes import API_DIALECTS, resolve_snow_table
from .core import (
    CoreError,
    CoreQuery,
    Filter,
    bearer_token,
    create_records,
    delete_record,
    get_record,
    list_records,
    update_record,
)

bp = Blueprint("servicenow", __name__)

OPS: list[tuple[str, str]] = [
    ("STARTSWITH", "startswith"),
    ("ENDSWITH", "endswith"),
    ("NOTLIKE", "notcontains"),
    ("LIKE", "contains"),
    ("!=", "neq"),
    (">=", "gte"),
    ("<=", "lte"),
    ("IN", "in"),
    (">", "gt"),
    ("<", "lt"),
    ("=", "eq"),
]


def snow_error(message: str, detail: str, status: int = 400) -> Response:
    """ServiceNow errors: {"error":{"message":..,"detail":..},"status":"failure"}."""
    response = jsonify({"error": {"message": message, "detail": detail}, "status": "failure"})
    response.status_code = status
    return response


def _unauthorized() -> Response:
    return snow_error("User Not Authenticated", "Required to provide Auth information", 401)


def parse_sysparm_query(query: str | None) -> tuple[list[Filter], str | None, bool]:
    """Parses `sysparm_query=name=foo^hostnameLIKEweb^ORDERBYname`."""
    filters: list[Filter] = []
    sort: str | None = None
    ascending = True
    for part in [p for p in (query or "").split("^") if p]:
        if part.startswith("ORDERBYDESC"):
            sort, ascending = part[len("ORDERBYDESC"):], False
            continue
        if part.startswith("ORDERBY"):
            sort, ascending = part[len("ORDERBY"):], True
            continue
        for token, op in OPS:
            idx = part.find(token)
            if idx > 0:
                filters.append(Filter(part[:idx], op, part[idx + len(token):]))
                break
    return filters, sort, ascending


def _parse_fields() -> list[str] | None:
    raw = request.args.get("sysparm_fields")
    if not raw:
        return None
    return [f.strip() for f in raw.split(",") if f.strip()]


def _paging() -> tuple[int, int]:
    try:
        limit = min(max(int(request.args.get("sysparm_limit", 50)), 1), 1000)
    except ValueError:
        limit = 50
    try:
        offset = max(int(request.args.get("sysparm_offset", 0)), 0)
    except ValueError:
        offset = 0
    return limit, offset


def _body() -> Any:
    return request.get_json(silent=True)


@bp.before_request
def _dialect_enabled():
    if not API_DIALECTS["servicenow"]:
        return snow_error("Not available", "ServiceNow dialect is disabled", 404)
    return None


@bp.route("/table/<table>", methods=["GET", "POST"])
@bp.route("/table/<table>/<sys_id>", methods=["GET", "PUT", "PATCH", "DELETE"])
def table_api(table: str, sys_id: str | None = None):
    cls = resolve_snow_table(table)
    if not cls:
        return snow_error("Invalid table", f"Table {table} is not exposed", 404)
    token = bearer_token(request)
    if not token:
        return _unauthorized()

    try:
        if request.method == "GET" and sys_id:
            row = get_record(cls.table, sys_id, _parse_fields(), token)
            if not row:
                return snow_error("No Record found", f"Record {sys_id} not found", 404)
            return jsonify({"result": row})

        if request.method == "GET":
            filters, sort, ascending = parse_sysparm_query(request.args.get("sysparm_query"))
            limit, offset = _paging()
            rows, count = list_records(
                cls.table,
                CoreQuery(
                    filters=filters,
                    fields=_parse_fields(),
                    sort=sort,
                    ascending=ascending,
                    limit=limit,
                    offset=offset,
                ),
                token,
            )
            response = jsonify({"result": rows})
            response.headers["X-Total-Count"] = str(count)
            return response

        if request.method == "POST":
            payload = _body()
            rows = payload if isinstance(payload, list) else [payload]
            created = create_records(cls.table, [r for r in rows if isinstance(r, dict)], token)
            result = created if isinstance(payload, list) else (created[0] if created else None)
            return jsonify({"result": result}), 201

        if request.method in ("PUT", "PATCH"):
            patch = _body()
            if not isinstance(patch, dict):
                return snow_error("Invalid request", "A JSON object body is required", 400)
            row = update_record(cls.table, sys_id, patch, token)
            if not row:
                return snow_error("No Record found", f"Record {sys_id} not found", 404)
            return jsonify({"result": row})

        delete_record(cls.table, sys_id, token)
        return Response(status=204)
    except CoreError as err:
        return snow_error("Invalid query", err.message, err.status)
