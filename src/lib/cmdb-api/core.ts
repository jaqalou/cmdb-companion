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

export function makeClient(authorization?: string | null): SupabaseClient {
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
  const supabase = makeClient(token);
  let query = supabase.from(table).select(selectList(q.fields), { count: "exact" });
  query = applyFilters(query, q.filters ?? []);
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
  const supabase = makeClient(token);
  const { data, error } = await supabase
    .from(table)
    .select(selectList(fields))
    .eq(PRIMARY_KEY, id)
    .maybeSingle();
  if (error) return { error: error.message, status: 400 };
  return { data: (data ?? null) as unknown as Row | null, count: data ? 1 : 0 };
}

export async function createRecords(
  table: string,
  rows: Row[],
  token: string | null,
): Promise<CoreResult<Row[]>> {
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
