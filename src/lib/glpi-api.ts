/**
 * GLPI dialect — translates apirest.php requests into core CMDB calls.
 * The ServiceNow dialect (src/lib/servicenow-api.ts) is a sibling of this file;
 * both share src/lib/cmdb-api/core.ts, so switching dialects is routing only.
 */
import {
  bearerToken,
  createRecords,
  deleteRecord,
  getRecord,
  jsonResponse,
  listRecords,
  sampleColumns,
  updateRecord,
  type Filter,
  type Operator,
  type Row,
} from "./cmdb-api/core";
import { ITEMTYPES, resolveItemtype } from "./glpi-itemtypes";

export { ITEMTYPES, resolveItemtype };
export const json = jsonResponse;
export const sessionToken = bearerToken;

/** GLPI returns errors as a two-element array: ["ERROR_CODE", "human message"]. */
export function glpiError(code: string, message: string, status = 400) {
  return jsonResponse([code, message], status);
}

const UNAUTHORIZED = () =>
  glpiError(
    "ERROR_SESSION_TOKEN_INVALID",
    "A valid Session-Token (or Authorization bearer) is required — CMDB records are not public.",
    401,
  );

const sqlError = (message: string, status: number) => glpiError("ERROR_SQL", message, status);

/** GLPI exposes a numeric `id`; the CMDB primary key is `sys_id`. */
function withId(row: Row) {
  return { id: row["sys_id"], ...row };
}

/** `range=0-49` (inclusive), GLPI style. */
function parseRange(url: URL) {
  const raw = url.searchParams.get("range") ?? "0-49";
  const [start, end] = raw.split("-").map((n) => Number(n));
  const from = Number.isFinite(start) ? Math.max(0, start!) : 0;
  const to = Number.isFinite(end) ? Math.max(from, end!) : from + 49;
  return { offset: from, limit: Math.min(to - from + 1, 1000) };
}

function parseFields(url: URL): string[] | null {
  const raw = url.searchParams.get("forcedisplay");
  if (!raw || raw === "all" || raw === "*") return null;
  return raw.split(",").map((f) => f.trim()).filter(Boolean);
}

const SEARCHTYPE_TO_OP: Record<string, Operator> = {
  equals: "eq",
  notequals: "neq",
  beginswith: "startswith",
  endswith: "endswith",
  morethan: "gt",
  lessthan: "lt",
  notcontains: "notcontains",
  contains: "contains",
};

type Criterion = { field?: string; searchtype?: string; value?: string };

/** Parses `criteria[0][field]=hostname&criteria[0][searchtype]=contains&...`. */
export function parseCriteria(url: URL): Criterion[] {
  const out: Criterion[] = [];
  for (const [key, value] of url.searchParams.entries()) {
    const m = key.match(/^criteria\[(\d+)\]\[(field|searchtype|value)\]$/);
    if (!m) continue;
    const idx = Number(m[1]);
    out[idx] = { ...(out[idx] ?? {}), [m[2]!]: value };
  }
  return out.filter(Boolean);
}

function criteriaToFilters(url: URL): Filter[] {
  return parseCriteria(url)
    .filter((c) => c.field)
    .map((c) => ({
      field: c.field!,
      op: SEARCHTYPE_TO_OP[(c.searchtype ?? "contains").toLowerCase()] ?? "contains",
      value: c.value ?? "",
    }));
}

/** GET /apirest.php/{itemtype} */
export async function getItems(table: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const { offset, limit } = parseRange(url);
  const sort = url.searchParams.get("sort");
  const res = await listRecords(
    table,
    { fields: parseFields(url), sort, ascending: url.searchParams.get("order") !== "DESC", offset, limit },
    token,
  );
  if ("error" in res) return sqlError(res.error, res.status);
  const rows = res.data.map(withId);
  const last = offset + Math.max(rows.length - 1, 0);
  return jsonResponse(rows, 200, {
    "Content-Range": `${offset}-${last}/${res.count}`,
    "Accept-Range": "items 1000",
  });
}

/** GET /apirest.php/{itemtype}/{id} */
export async function getItem(table: string, id: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const res = await getRecord(table, id, parseFields(url), token);
  if ("error" in res) return sqlError(res.error, res.status);
  if (!res.data) return glpiError("ERROR_ITEM_NOT_FOUND", `Item ${id} not found`, 404);
  return jsonResponse(withId(res.data));
}

/** GET /apirest.php/search/{itemtype} */
export async function searchItems(table: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const { offset, limit } = parseRange(url);
  const sort = url.searchParams.get("sort");
  const order = url.searchParams.get("order") === "DESC" ? "DESC" : "ASC";
  const res = await listRecords(
    table,
    { filters: criteriaToFilters(url), fields: parseFields(url), sort, ascending: order === "ASC", offset, limit },
    token,
  );
  if ("error" in res) return sqlError(res.error, res.status);
  const rows = res.data.map(withId);
  return jsonResponse(
    {
      totalcount: res.count,
      count: rows.length,
      sort: sort ?? null,
      order,
      range: `${offset}-${offset + Math.max(rows.length - 1, 0)}`,
      data: rows,
    },
    rows.length ? 200 : 206,
  );
}

/** GLPI wraps writes in an `input` envelope: {"input": {...}} or {"input": [...]}. */
function unwrapInput(body: unknown) {
  if (body && typeof body === "object" && "input" in (body as Row)) return (body as Row)["input"];
  return body;
}

/** POST /apirest.php/{itemtype} */
export async function addItems(table: string, body: unknown, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const input = unwrapInput(body);
  const rows = (Array.isArray(input) ? input : [input]) as Row[];
  const res = await createRecords(table, rows, token);
  if ("error" in res) return sqlError(res.error, res.status);
  const result = res.data.map((r) => ({ id: r["sys_id"], message: "" }));
  return jsonResponse(Array.isArray(input) ? result : (result[0] ?? {}), 201);
}

/** PUT /apirest.php/{itemtype}/{id} */
export async function updateItem(table: string, id: string, body: unknown, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const res = await updateRecord(table, id, unwrapInput(body) as Row, token);
  if ("error" in res) return sqlError(res.error, res.status);
  if (!res.data) return glpiError("ERROR_ITEM_NOT_FOUND", `Item ${id} not found`, 404);
  return jsonResponse([{ [id]: true, message: "" }]);
}

/** DELETE /apirest.php/{itemtype}/{id} */
export async function deleteItem(table: string, id: string, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const res = await deleteRecord(table, id, token);
  if ("error" in res) return sqlError(res.error, res.status);
  return jsonResponse([{ [id]: true, message: "" }]);
}

/** GET /apirest.php/listSearchOptions/{itemtype} */
export async function listSearchOptions(table: string, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const res = await sampleColumns(table, token);
  if ("error" in res) return sqlError(res.error, res.status);
  const options: Record<string, unknown> = { common: "Characteristics" };
  res.data.forEach((field, i) => {
    options[String(i + 1)] = { name: field, field, table, datatype: "string", uid: `${table}.${field}` };
  });
  return jsonResponse(options);
}
