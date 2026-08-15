import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ITEMTYPES, resolveItemtype } from "./glpi-itemtypes";

export { ITEMTYPES, resolveItemtype };

function makeClient(authorization?: string | null): SupabaseClient {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        if (authorization) h.set("Authorization", authorization);
        else if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** GLPI returns errors as a two-element array: ["ERROR_CODE", "human message"]. */
export function glpiError(code: string, message: string, status = 400) {
  return json([code, message], status);
}

/**
 * GLPI accepts the session token in `Session-Token` and the app token in
 * `App-Token`. Here the session token is the Supabase access token, so RLS keeps
 * deciding what the caller may see.
 */
export function sessionToken(request: Request): string | null {
  const session = request.headers.get("session-token");
  if (session) return `Bearer ${session.replace(/^Bearer\s+/i, "")}`;
  const auth = request.headers.get("authorization");
  return auth ? auth : null;
}

/** GLPI exposes a numeric `id`; the CMDB primary key is `sys_id`. */
function withId<T extends Record<string, unknown>>(row: T) {
  return { id: row["sys_id"], ...row };
}

/** `range=0-49` (inclusive), GLPI style. */
function parseRange(url: URL) {
  const raw = url.searchParams.get("range") ?? "0-49";
  const [start, end] = raw.split("-").map((n) => Number(n));
  const from = Number.isFinite(start) ? Math.max(0, start!) : 0;
  const to = Number.isFinite(end) ? Math.max(from, end!) : from + 49;
  return { from, to: Math.min(to, from + 999) };
}

type Filterable = {
  eq: (a: string, b: string) => unknown;
  neq: (a: string, b: string) => unknown;
  ilike: (a: string, b: string) => unknown;
  gt: (a: string, b: string) => unknown;
  lt: (a: string, b: string) => unknown;
  not: (a: string, op: string, b: unknown) => unknown;
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

function applyCriteria<T>(query: T, criteria: Criterion[]): T {
  let q = query as never as Filterable;
  for (const c of criteria) {
    if (!c.field) continue;
    const field = c.field;
    const value = c.value ?? "";
    switch ((c.searchtype ?? "contains").toLowerCase()) {
      case "equals":
        q = q.eq(field, value) as typeof q;
        break;
      case "notequals":
        q = q.neq(field, value) as typeof q;
        break;
      case "beginswith":
        q = q.ilike(field, `${value}%`) as typeof q;
        break;
      case "endswith":
        q = q.ilike(field, `%${value}`) as typeof q;
        break;
      case "morethan":
        q = q.gt(field, value) as typeof q;
        break;
      case "lessthan":
        q = q.lt(field, value) as typeof q;
        break;
      case "notcontains":
        q = q.not(field, "ilike", `%${value}%`) as typeof q;
        break;
      default:
        q = q.ilike(field, `%${value}%`) as typeof q;
    }
  }
  return q as never as T;
}

function selectList(raw: string | null) {
  if (!raw || raw === "all" || raw === "*") return "*";
  return raw
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean)
    .join(",");
}

const UNAUTHORIZED = () =>
  glpiError(
    "ERROR_SESSION_TOKEN_INVALID",
    "A valid Session-Token (or Authorization bearer) is required — CMDB records are not public.",
    401,
  );

/** GET /apirest.php/{itemtype} */
export async function getItems(table: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const { from, to } = parseRange(url);
  const supabase = makeClient(token);
  let query = supabase
    .from(table)
    .select(selectList(url.searchParams.get("forcedisplay")), { count: "exact" });

  const sort = url.searchParams.get("sort");
  if (sort) query = query.order(sort, { ascending: url.searchParams.get("order") !== "DESC" });

  const { data, error, count } = await query.range(from, to);
  if (error) return glpiError("ERROR_SQL", error.message, 400);
  const rows = (data ?? []).map((r) => withId(r as unknown as Record<string, unknown>));
  const last = from + Math.max(rows.length - 1, 0);
  return json(rows, rows.length ? 200 : 200, {
    "Content-Range": `${from}-${last}/${count ?? rows.length}`,
    "Accept-Range": "items 1000",
  });
}

/** GET /apirest.php/{itemtype}/{id} */
export async function getItem(table: string, id: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const supabase = makeClient(token);
  const { data, error } = await supabase
    .from(table)
    .select(selectList(url.searchParams.get("forcedisplay")))
    .eq("sys_id", id)
    .maybeSingle();
  if (error) return glpiError("ERROR_SQL", error.message, 400);
  if (!data) return glpiError("ERROR_ITEM_NOT_FOUND", `Item ${id} not found`, 404);
  return json(withId(data as unknown as Record<string, unknown>));
}

/** GET /apirest.php/search/{itemtype} */
export async function searchItems(table: string, url: URL, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const { from, to } = parseRange(url);
  const supabase = makeClient(token);
  let query = supabase
    .from(table)
    .select(selectList(url.searchParams.get("forcedisplay")), { count: "exact" });
  query = applyCriteria(query, parseCriteria(url));

  const sort = url.searchParams.get("sort");
  const order = url.searchParams.get("order") === "DESC" ? "DESC" : "ASC";
  if (sort) query = query.order(sort, { ascending: order === "ASC" });

  const { data, error, count } = await query.range(from, to);
  if (error) return glpiError("ERROR_SQL", error.message, 400);
  const rows = (data ?? []).map((r) => withId(r as unknown as Record<string, unknown>));
  return json(
    {
      totalcount: count ?? rows.length,
      count: rows.length,
      sort: sort ?? null,
      order,
      range: `${from}-${from + Math.max(rows.length - 1, 0)}`,
      data: rows,
    },
    rows.length ? 200 : 206,
  );
}

type ItemPayload = { input?: unknown } | unknown;

/** GLPI wraps writes in an `input` envelope: {"input": {...}} or {"input": [...]}. */
function unwrapInput(body: ItemPayload) {
  if (body && typeof body === "object" && "input" in (body as unknown as Record<string, unknown>))
    return (body as unknown as Record<string, unknown>)["input"];
  return body;
}

/** POST /apirest.php/{itemtype} */
export async function addItems(table: string, body: unknown, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const input = unwrapInput(body);
  const rows = Array.isArray(input) ? input : [input];
  const supabase = makeClient(token);
  const { data, error } = await supabase.from(table).insert(rows as never).select();
  if (error) return glpiError("ERROR_SQL", error.message, 400);
  const result = (data ?? []).map((r) => ({
    id: (r as unknown as Record<string, unknown>)["sys_id"],
    message: "",
  }));
  return json(Array.isArray(input) ? result : (result[0] ?? {}), 201);
}

/** PUT /apirest.php/{itemtype}/{id} */
export async function updateItem(
  table: string,
  id: string,
  body: unknown,
  token: string | null,
) {
  if (!token) return UNAUTHORIZED();
  const supabase = makeClient(token);
  const { data, error } = await supabase
    .from(table)
    .update(unwrapInput(body) as never)
    .eq("sys_id", id)
    .select()
    .maybeSingle();
  if (error) return glpiError("ERROR_SQL", error.message, 400);
  if (!data) return glpiError("ERROR_ITEM_NOT_FOUND", `Item ${id} not found`, 404);
  return json([{ [id]: true, message: "" }]);
}

/** DELETE /apirest.php/{itemtype}/{id} */
export async function deleteItem(table: string, id: string, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const supabase = makeClient(token);
  const { error } = await supabase.from(table).delete().eq("sys_id", id);
  if (error) return glpiError("ERROR_SQL", error.message, 400);
  return json([{ [id]: true, message: "" }]);
}

/** GET /apirest.php/listSearchOptions/{itemtype} */
export async function listSearchOptions(table: string, token: string | null) {
  if (!token) return UNAUTHORIZED();
  const supabase = makeClient(token);
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) return glpiError("ERROR_SQL", error.message, 400);
  const sample = (data?.[0] ?? {}) as Record<string, unknown>;
  const options: Record<string, unknown> = { common: "Characteristics" };
  Object.keys(sample).forEach((field, i) => {
    options[String(i + 1)] = { name: field, field, table, datatype: "string", uid: `${table}.${field}` };
  });
  return json(options);
}
