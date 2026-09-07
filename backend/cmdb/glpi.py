"""GLPI dialect — translates apirest.php requests into core CMDB calls.

The ServiceNow dialect (backend/cmdb/snow.py) is a sibling of this module; both
share backend/cmdb/core.py, so switching dialects is routing only.
"""

from __future__ import annotations

import re
from typing import Any

from flask import Blueprint, Response, jsonify, request

from .classes import API_DIALECTS, resolve_glpi_itemtype
from .core import (
    CoreError,
    CoreQuery,
    Filter,
    Row,
    bearer_token,
    create_records,
    delete_record,
    get_record,
    list_records,
    sample_columns,
    update_record,
)

bp = Blueprint("glpi", __name__)

SEARCHTYPE_TO_OP = {
    "equals": "eq",
    "notequals": "neq",
    "beginswith": "startswith",
    "endswith": "endswith",
    "morethan": "gt",
    "lessthan": "lt",
    "notcontains": "notcontains",
    "contains": "contains",
}

CRITERIA_RE = re.compile(r"^criteria\[(\d+)\]\[(field|searchtype|value)\]$")


def glpi_error(code: str, message: str, status: int = 400) -> Response:
    """GLPI returns errors as a two-element array: ["ERROR_CODE", "message"]."""
    response = jsonify([code, message])
    response.status_code = status
    return response


def _unauthorized() -> Response:
    return glpi_error(
        "ERROR_SESSION_TOKEN_INVALID",
        "A valid Session-Token (or Authorization bearer) is required — CMDB records are not public.",
        401,
    )


def _sql_error(err: CoreError) -> Response:
    return glpi_error("ERROR_SQL", err.message, err.status)


def _with_id(row: Row) -> Row:
    return {"id": row.get("sys_id"), **row}


def _parse_range() -> tuple[int, int]:
    """`range=0-49` (inclusive), GLPI style."""
    raw = request.args.get("range", "0-49")
    parts = raw.split("-")
    try:
        start = max(0, int(parts[0]))
    except (ValueError, IndexError):
        start = 0
    try:
        end = max(start, int(parts[1]))
    except (ValueError, IndexError):
        end = start + 49
    return start, min(end - start + 1, 1000)


def _parse_fields() -> list[str] | None:
    raw = request.args.get("forcedisplay")
    if not raw or raw in ("all", "*"):
        return None
    return [f.strip() for f in raw.split(",") if f.strip()]


def _criteria_filters() -> list[Filter]:
    found: dict[int, dict[str, str]] = {}
    for key, value in request.args.items(multi=True):
        m = CRITERIA_RE.match(key)
        if not m:
            continue
        found.setdefault(int(m.group(1)), {})[m.group(2)] = value
    filters: list[Filter] = []
    for _, c in sorted(found.items()):
        if not c.get("field"):
            continue
        op = SEARCHTYPE_TO_OP.get((c.get("searchtype") or "contains").lower(), "contains")
        filters.append(Filter(c["field"], op, c.get("value", "")))
    return filters


def _unwrap_input(body: Any) -> Any:
    """GLPI wraps writes in an `input` envelope: {"input": {...}} or {"input": [...]}"""
    if isinstance(body, dict) and "input" in body:
        return body["input"]
    return body


def _body() -> Any:
    return request.get_json(silent=True)


@bp.before_request
def _dialect_enabled():
    if not API_DIALECTS["glpi"]:
        return glpi_error("ERROR_RESOURCE_NOT_FOUND", "GLPI dialect is disabled", 404)
    return None


@bp.route("/initSession", methods=["GET", "POST"])
def init_session():
    token = bearer_token(request)
    if not token:
        return glpi_error(
            "ERROR_LOGIN_PARAMETERS_MISSING",
            "Provide an Authorization bearer token for a CB Assets account",
            401,
        )
    return jsonify({"session_token": re.sub(r"^Bearer\s+", "", token, flags=re.I)})


@bp.route("/killSession", methods=["GET", "POST"])
def kill_session():
    return jsonify({})


@bp.route("/getMyProfiles", methods=["GET"])
@bp.route("/getActiveProfile", methods=["GET"])
def profiles():
    if not bearer_token(request):
        return glpi_error("ERROR_SESSION_TOKEN_INVALID", "Session token required", 401)
    return jsonify({"myprofiles": [{"id": 1, "name": "CB Assets"}]})


@bp.route("/listSearchOptions/<itemtype>", methods=["GET"])
def list_search_options(itemtype: str):
    target = resolve_glpi_itemtype(itemtype)
    if not target:
        return glpi_error("ERROR_ITEMTYPE_NOT_FOUND", f"Unknown itemtype {itemtype}", 404)
    token = bearer_token(request)
    if not token:
        return _unauthorized()
    try:
        columns = sample_columns(target.table, token)
    except CoreError as err:
        return _sql_error(err)
    options: dict[str, Any] = {"common": "Characteristics"}
    for i, name in enumerate(columns, start=1):
        options[str(i)] = {
            "name": name,
            "field": name,
            "table": target.table,
            "datatype": "string",
            "uid": f"{target.table}.{name}",
        }
    return jsonify(options)


@bp.route("/search/<itemtype>", methods=["GET"])
def search_items(itemtype: str):
    target = resolve_glpi_itemtype(itemtype)
    if not target:
        return glpi_error("ERROR_ITEMTYPE_NOT_FOUND", f"Unknown itemtype {itemtype}", 404)
    token = bearer_token(request)
    if not token:
        return _unauthorized()
    offset, limit = _parse_range()
    sort = request.args.get("sort")
    order = "DESC" if request.args.get("order") == "DESC" else "ASC"
    try:
        rows, count = list_records(
            target.table,
            CoreQuery(
                filters=_criteria_filters(),
                fields=_parse_fields(),
                sort=sort,
                ascending=order == "ASC",
                offset=offset,
                limit=limit,
            ),
            token,
        )
    except CoreError as err:
        return _sql_error(err)
    data = [_with_id(r) for r in rows]
    payload = {
        "totalcount": count,
        "count": len(data),
        "sort": sort,
        "order": order,
        "range": f"{offset}-{offset + max(len(data) - 1, 0)}",
        "data": data,
    }
    return jsonify(payload), (200 if data else 206)


@bp.route("/<itemtype>", methods=["GET", "POST"])
@bp.route("/<itemtype>/<item_id>", methods=["GET", "PUT", "PATCH", "DELETE"])
def items(itemtype: str, item_id: str | None = None):
    target = resolve_glpi_itemtype(itemtype)
    if not target:
        return glpi_error("ERROR_ITEMTYPE_NOT_FOUND", f"Unknown itemtype {itemtype}", 404)
    token = bearer_token(request)
    if not token:
        return _unauthorized()
    table = target.table

    try:
        if request.method == "GET" and item_id:
            row = get_record(table, item_id, _parse_fields(), token)
            if not row:
                return glpi_error("ERROR_ITEM_NOT_FOUND", f"Item {item_id} not found", 404)
            return jsonify(_with_id(row))

        if request.method == "GET":
            offset, limit = _parse_range()
            rows, count = list_records(
                table,
                CoreQuery(
                    fields=_parse_fields(),
                    sort=request.args.get("sort"),
                    ascending=request.args.get("order") != "DESC",
                    offset=offset,
                    limit=limit,
                ),
                token,
            )
            data = [_with_id(r) for r in rows]
            response = jsonify(data)
            last = offset + max(len(data) - 1, 0)
            response.headers["Content-Range"] = f"{offset}-{last}/{count}"
            response.headers["Accept-Range"] = "items 1000"
            return response

        if request.method == "POST":
            payload = _unwrap_input(_body())
            rows = payload if isinstance(payload, list) else [payload]
            created = create_records(table, [r for r in rows if isinstance(r, dict)], token)
            result = [{"id": r.get("sys_id"), "message": ""} for r in created]
            body = result if isinstance(payload, list) else (result[0] if result else {})
            return jsonify(body), 201

        if request.method in ("PUT", "PATCH"):
            patch = _unwrap_input(_body())
            if not isinstance(patch, dict):
                return glpi_error("ERROR_BAD_ARRAY", "An input object is required", 400)
            row = update_record(table, item_id, patch, token)
            if not row:
                return glpi_error("ERROR_ITEM_NOT_FOUND", f"Item {item_id} not found", 404)
            return jsonify([{item_id: True, "message": ""}])

        delete_record(table, item_id, token)
        return jsonify([{item_id: True, "message": ""}])
    except CoreError as err:
        return _sql_error(err)
