/**
 * Dialect-agnostic CMDB data core.
 *
 * Every REST dialect (GLPI today, ServiceNow Table API alongside it) is a thin
 * translation layer on top of these primitives: parse the dialect's query
 * shape into a `CoreQuery`, call the core, then shape the result into the
 * dialect's response envelope. Swapping or adding a dialect never touches the
 * database access code below.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Operator =
  | "eq"
  | "neq"
  | "contains"
  | "notcontains"
  | "startswith"
  | "endswith"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "in";

export type Filter = { field: string; op: Operator; value: string };

export type CoreQuery = {
  filters?: Filter[];
  fields?: string[] | null;
  sort?: string | null;
  ascending?: boolean;
  offset?: number;
  limit?: number;
};

export type Row = Record<string, unknown>;
export type CoreResult<T> = { data: T; count: number } | { error: string; status: number };

export const PRIMARY_KEY = "sys_id";

/**
 * Sentinel used instead of a bearer token when the caller was authenticated
 * with a CB Assets API token. Those are not JWTs, so the request runs with the
 * service key and the API layer enforces the caller's roles itself.
 */
export const SERVICE_TOKEN = "__cb_assets_api_token__";

export function isServiceToken(token?: string | null) {
  return !!token && (token === SERVICE_TOKEN || token.startsWith(`${SERVICE_TOKEN}:`));
}

/** Service credential that also carries the API token's owner, so scopes can be enforced. */
export function serviceTokenFor(userId: string) {
  return `${SERVICE_TOKEN}:${userId}`;
}

type Scope = {
  admin: boolean;
  limited: boolean;
  classes: string[] | null;
  dims: Record<string, string[]>;
};

const LIMITED_FIELDS: Record<string, string[]> = {
  cmdb_ci_server: ["sys_id", "hostname", "operating_system"],
  cmdb_ci_db_mssql_instance: ["sys_id", "server_name", "operating_system"],
  cmdb_ci_netgear_switch: ["sys_id", "hostname", "firmware_version"],
  cmdb_ci_wap: ["sys_id", "ap_name", "firmware_version"],
};

async function loadScope(token: string | null): Promise<Scope | null> {
  if (!isServiceToken(token)) return null; // JWT callers: row level security applies
  const userId = token!.slice(SERVICE_TOKEN.length + 1);
  if (!userId) return { admin: true, limited: false, classes: null, dims: {} };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: roles }, { data: scopes }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("user_scopes" as never).select("dimension, value").eq("user_id", userId),
  ]);
  const admin = ((roles ?? []) as { role: string }[]).some((r) => r.role === "admin");
  const list = (scopes ?? []) as unknown as { dimension: string; value: string }[];
  const dims: Record<string, string[]> = {};
  let classes: string[] | null = null;
  for (const { dimension, value } of list) {
    if (dimension === "ci_class") {
      if (value === "*") classes = classes ?? null;
      else classes = [...(classes ?? []), value];
      continue;
    }
    if (dims[dimension]?.includes("*")) continue;
    dims[dimension] = value === "*" ? ["*"] : [...(dims[dimension] ?? []), value];
  }
  if (list.some((s) => s.dimension === "ci_class" && s.value === "*")) classes = null;
  for (const k of Object.keys(dims)) if (dims[k]!.includes("*")) delete dims[k];
  return { admin, limited: !admin && list.length === 0, classes, dims };
}

function quoteLike(v: string) {
  const esc = v.trim().replace(/\\/g, "\\\\").replace(/[%_]/g, (m) => `\\${m}`).replace(/"/g, '\\"');
  return `"${esc}"`;
}

function applyScope<T>(query: T, scope: Scope): T {
  let q = query as unknown as { or: (f: string) => unknown };
  for (const [dim, values] of Object.entries(scope.dims)) {
    q = q.or(values.map((v) => `${dim}.ilike.${quoteLike(v)}`).join(",")) as typeof q;
  }
  return q as unknown as T;
}

function classAllowed(scope: Scope, table: string) {
  return scope.admin || !scope.classes || scope.classes.includes(table);
}

function rowInScope(scope: Scope, row: Row) {
  for (const [dim, values] of Object.entries(scope.dims)) {
    const v = String(row[dim] ?? "").trim().toLowerCase();
    if (!values.some((a) => a.trim().toLowerCase() === v)) return false;
  }
  return true;
}

const OUT_OF_SCOPE = {
  error: "This record is outside the access scopes of the account behind this API token",
  status: 403,
} as const;

export function makeClient(authorization?: string | null): SupabaseClient {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
  const serviceMode = isServiceToken(authorization);
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (serviceMode && !serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const key =
    (serviceMode ? serviceKey : undefined) ??
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
  const bearer = serviceMode ? null : authorization;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        if (bearer) h.set("Authorization", bearer);
        else if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}


type Filterable = {
  eq: (a: string, b: string) => unknown;
  neq: (a: string, b: string) => unknown;
  ilike: (a: string, b: string) => unknown;
  gt: (a: string, b: string) => unknown;
  lt: (a: string, b: string) => unknown;
  gte: (a: string, b: string) => unknown;
  lte: (a: string, b: string) => unknown;
  in: (a: string, b: string[]) => unknown;
  not: (a: string, op: string, b: unknown) => unknown;
};

function applyFilters<T>(query: T, filters: Filter[]): T {
  let q = query as never as Filterable;
  for (const { field, op, value } of filters) {
    switch (op) {
      case "eq":
        q = q.eq(field, value) as typeof q;
        break;
      case "neq":
        q = q.neq(field, value) as typeof q;
        break;
      case "startswith":
        q = q.ilike(field, `${value}%`) as typeof q;
        break;
      case "endswith":
        q = q.ilike(field, `%${value}`) as typeof q;
        break;
      case "gt":
        q = q.gt(field, value) as typeof q;
        break;
      case "lt":
        q = q.lt(field, value) as typeof q;
        break;
      case "gte":
        q = q.gte(field, value) as typeof q;
        break;
      case "lte":
        q = q.lte(field, value) as typeof q;
        break;
      case "in":
        q = q.in(field, value.split(",").map((v) => v.trim())) as typeof q;
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

function selectList(fields?: string[] | null) {
  if (!fields || !fields.length) return "*";
  return fields.join(",");
}

export async function listRecords(
  table: string,
  q: CoreQuery,
  token: string | null,
): Promise<CoreResult<Row[]>> {
  const scope = await loadScope(token);
  if (scope && !scope.admin && !classAllowed(scope, table)) return { data: [], count: 0 };
  const fields = scope?.limited ? (LIMITED_FIELDS[table] ?? ["sys_id"]) : q.fields;
  const supabase = makeClient(token);
  let query = supabase.from(table).select(selectList(fields), { count: "exact" });
  query = applyFilters(query, q.filters ?? []);
  if (scope && !scope.admin && !scope.limited) query = applyScope(query, scope);
  if (q.sort) query = query.order(q.sort, { ascending: q.ascending !== false });
  const offset = q.offset ?? 0;
  const limit = Math.min(q.limit ?? 50, 1000);
  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return { error: error.message, status: 400 };
  return { data: (data ?? []) as unknown as Row[], count: count ?? (data?.length ?? 0) };
}

export async function getRecord(
  table: string,
  id: string,
  fields: string[] | null,
  token: string | null,
): Promise<CoreResult<Row | null>> {
  const scope = await loadScope(token);
  if (scope && !scope.admin && (scope.limited || !classAllowed(scope, table)))
    return { data: null, count: 0 };
  const supabase = makeClient(token);
  let query = supabase.from(table).select(selectList(fields)).eq(PRIMARY_KEY, id);
  if (scope && !scope.admin) query = applyScope(query, scope);
  const { data, error } = await query.maybeSingle();
  if (error) return { error: error.message, status: 400 };
  return { data: (data ?? null) as unknown as Row | null, count: data ? 1 : 0 };
}

export async function createRecords(
  table: string,
  rows: Row[],
  token: string | null,
): Promise<CoreResult<Row[]>> {
  const scope = await loadScope(token);
  if (scope && !scope.admin) {
    if (scope.limited || !classAllowed(scope, table) || !rows.every((r) => rowInScope(scope, r)))
      return OUT_OF_SCOPE;
  }
  const supabase = makeClient(token);
  const { data, error } = await supabase.from(table).insert(rows as never).select();
  if (error) return { error: error.message, status: 400 };
  return { data: (data ?? []) as unknown as Row[], count: data?.length ?? 0 };
}

export async function updateRecord(
  table: string,
  id: string,
  patch: Row,
  token: string | null,
): Promise<CoreResult<Row | null>> {
  const scope = await loadScope(token);
  if (scope && !scope.admin) {
    if (scope.limited || !classAllowed(scope, table)) return OUT_OF_SCOPE;
    const current = await getRecord(table, id, null, token);
    if ("error" in current) return current;
    if (!current.data) return { data: null, count: 0 };
    if (!rowInScope(scope, { ...current.data, ...patch })) return OUT_OF_SCOPE;
  }
  const supabase = makeClient(token);
  const { data, error } = await supabase
    .from(table)
    .update(patch as never)
    .eq(PRIMARY_KEY, id)
    .select()
    .maybeSingle();
  if (error) return { error: error.message, status: 400 };
  return { data: (data ?? null) as unknown as Row | null, count: data ? 1 : 0 };
}

export async function deleteRecord(
  table: string,
  id: string,
  token: string | null,
): Promise<CoreResult<null>> {
  const supabase = makeClient(token);
  const { error } = await supabase.from(table).delete().eq(PRIMARY_KEY, id);
  if (error) return { error: error.message, status: 400 };
  return { data: null, count: 0 };
}

export async function sampleColumns(
  table: string,
  token: string | null,
): Promise<CoreResult<string[]>> {
  const supabase = makeClient(token);
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) return { error: error.message, status: 400 };
  return { data: Object.keys((data?.[0] ?? {}) as Row), count: 1 };
}

/** Bearer token from either dialect's auth header (GLPI Session-Token or Authorization). */
export function bearerToken(request: Request): string | null {
  const session = request.headers.get("session-token");
  if (session) return `Bearer ${session.replace(/^Bearer\s+/i, "")}`;
  const auth = request.headers.get("authorization");
  return auth ? auth : null;
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
