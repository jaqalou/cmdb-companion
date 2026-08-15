/**
 * ServiceNow dialect — Table API over the same core as GLPI.
 * Enabled/disabled with API_DIALECTS in src/lib/cmdb-api/config.ts.
 */
import {
  bearerToken,
  createRecords,
  deleteRecord,
  getRecord,
  jsonResponse,
  listRecords,
  updateRecord,
  type Filter,
  type Operator,
  type Row,
} from "./cmdb-api/core";
import { resolveSnowTable } from "./cmdb-api/classes";

export { resolveSnowTable, bearerToken as snowToken };

/** ServiceNow errors: {"error":{"message":..,"detail":..},"status":"failure"}. */
export function snowError(message: string, detail: string, status = 400) {
  return jsonResponse({ error: { message, detail }, status: "failure" }, status);
}

const UNAUTHORIZED = () =>
  snowError("User Not Authenticated", "Required to provide Auth information", 401);

const OPS: Array<[string, Operator]> = [
  ["STARTSWITH", "startswith"],
  ["ENDSWITH", "endswith"],
  ["NOTLIKE", "notcontains"],
  ["LIKE", "contains"],
  ["!=", "neq"],
  [">=", "gte"],
  ["<=", "lte"],
  ["IN", "in"],
  [">", "gt"],
  ["<", "lt"],
  ["=", "eq"],
];

/** Parses `sysparm_query=name=foo^hostnameLIKEweb^ORDERBYname`. */
export function parseSysparmQuery(query: string | null): { filters: Filter[]; sort: string | null; ascending: boolean } {
  const filters: Filter[] = [];
  let sort: string | null = null;
  let ascending = true;
  for (const part of (query ?? "").split("^").filter(Boolean)) {
    if (part.startsWith("ORDERBYDESC")) {
      sort = part.slice("ORDERBYDESC".length);
      ascending = false;
      continue;
    }
    if (part.startsWith("ORDERBY")) {
      sort = part.slice("ORDERBY".length);
      ascending = true;
      continue;
    }
    for (const [token, op] of OPS) {
      const idx = part.indexOf(token);
      if (idx > 0) {
        filters.push({ field: part.slice(0, idx), op, value: part.slice(idx + token.length) });
        break;
      }
    }
  }
  return { filters, sort, ascending };
}

function parseFields(url: URL): string[] | null {
  const raw = url.searchParams.get("sysparm_fields");
  if (!raw) return null;
  return raw.split(",").map((f) => f.trim()).filter(Boolean);
}

function paging(url: URL) {
  const limit = Number(url.searchParams.get("sysparm_limit") ?? 50);
  const offset = Number(url.searchParams.get("sysparm_offset") ?? 0);
  return {
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 50,
    offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
  };
}

/** GET /api/now/table/{table} */
export async function snowList(table: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const { filters, sort, ascending } = parseSysparmQuery(url.searchParams.get("sysparm_query"));
  const { limit, offset } = paging(url);
  const res = await listRecords(table, { filters, fields: parseFields(url), sort, ascending, limit, offset }, token);
  if ("error" in res) return snowError("Invalid query", res.error, res.status);
  return jsonResponse({ result: res.data }, 200, { "X-Total-Count": String(res.count) });
}

/** GET /api/now/table/{table}/{sys_id} */
export async function snowGet(table: string, id: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const res = await getRecord(table, id, parseFields(url), token);
  if ("error" in res) return snowError("Invalid request", res.error, res.status);
  if (!res.data) return snowError("No Record found", `Record ${id} not found in table ${table}`, 404);
  return jsonResponse({ result: res.data });
}

/** POST /api/now/table/{table} */
export async function snowInsert(table: string, body: unknown, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const rows = (Array.isArray(body) ? body : [body]) as Row[];
  const res = await createRecords(table, rows, token);
  if ("error" in res) return snowError("Insert failed", res.error, res.status);
  return jsonResponse({ result: Array.isArray(body) ? res.data : (res.data[0] ?? null) }, 201);
}

/** PUT/PATCH /api/now/table/{table}/{sys_id} */
export async function snowUpdate(table: string, id: string, body: unknown, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const res = await updateRecord(table, id, body as Row, token);
  if ("error" in res) return snowError("Update failed", res.error, res.status);
  if (!res.data) return snowError("No Record found", `Record ${id} not found in table ${table}`, 404);
  return jsonResponse({ result: res.data });
}

/** DELETE /api/now/table/{table}/{sys_id} */
export async function snowDelete(table: string, id: string, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const res = await deleteRecord(table, id, token);
  if ("error" in res) return snowError("Delete failed", res.error, res.status);
  return new Response(null, { status: 204 });
}
