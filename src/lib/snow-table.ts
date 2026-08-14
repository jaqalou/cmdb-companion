import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const TABLES: Record<string, string> = {
  cmdb_ci_server: "cmdb_ci_server",
  cmdb_ci_db_mssql_instance: "cmdb_ci_db_mssql_instance",
};

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

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function failure(message: string, status: number, detail = "") {
  return json({ error: { message, detail }, status: "failure" }, status);
}

export function resolveTable(name: string) {
  return TABLES[name] ?? null;
}

type AnyQuery = ReturnType<ReturnType<typeof makeClient>["from"]>["select"] extends (
  ...args: never
) => infer R
  ? R
  : never;

/** Applies a ServiceNow-style encoded query (field=value^fieldLIKEvalue) */
function applyEncodedQuery<T>(query: T, encoded: string): T {
  let q = query as never as {
    eq: (a: string, b: string) => unknown;
    neq: (a: string, b: string) => unknown;
    ilike: (a: string, b: string) => unknown;
    in: (a: string, b: string[]) => unknown;
    gt: (a: string, b: string) => unknown;
    lt: (a: string, b: string) => unknown;
  };
  for (const part of encoded.split("^")) {
    if (!part.trim()) continue;
    let m: RegExpMatchArray | null;
    if ((m = part.match(/^(\w+)STARTSWITH(.*)$/)))
      q = q.ilike(m[1]!, `${m[2]}%`) as typeof q;
    else if ((m = part.match(/^(\w+)ENDSWITH(.*)$/))) q = q.ilike(m[1]!, `%${m[2]}`) as typeof q;
    else if ((m = part.match(/^(\w+)LIKE(.*)$/))) q = q.ilike(m[1]!, `%${m[2]}%`) as typeof q;
    else if ((m = part.match(/^(\w+)IN(.*)$/))) q = q.in(m[1]!, m[2]!.split(",")) as typeof q;
    else if ((m = part.match(/^(\w+)!=(.*)$/))) q = q.neq(m[1]!, m[2]!) as typeof q;
    else if ((m = part.match(/^(\w+)>(.*)$/))) q = q.gt(m[1]!, m[2]!) as typeof q;
    else if ((m = part.match(/^(\w+)<(.*)$/))) q = q.lt(m[1]!, m[2]!) as typeof q;
    else if ((m = part.match(/^(\w+)=(.*)$/))) q = q.eq(m[1]!, m[2]!) as typeof q;
  }
  return q as never as T;
}

export async function listRecords(table: string, url: URL, authorization: string | null) {
  if (!authorization)
    return failure("Unauthorized", 401, "Bearer token required — CMDB records are not public");
  const p = url.searchParams;
  const fields = p.get("sysparm_fields")?.trim();
  const limit = Math.min(Number(p.get("sysparm_limit") ?? 100) || 100, 1000);
  const offset = Number(p.get("sysparm_offset") ?? 0) || 0;
  const supabase = makeClient(authorization);

  let query = supabase
    .from(table)
    .select(fields ? fields.split(",").map((f) => f.trim()).join(",") : "*", { count: "exact" });

  const encoded = p.get("sysparm_query");
  if (encoded) query = applyEncodedQuery(query, encoded);

  const orderBy = p.get("sysparm_order_by") ?? p.get("sysparm_order_by_desc");
  if (orderBy) query = query.order(orderBy, { ascending: !p.get("sysparm_order_by_desc") });

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return failure(error.message, 400, error.details ?? "");
  return json({ result: data ?? [], meta: { count: count ?? 0, limit, offset } });
}

export async function getRecord(
  table: string,
  sysId: string,
  url: URL,
  authorization: string | null,
) {
  if (!authorization)
    return failure("Unauthorized", 401, "Bearer token required — CMDB records are not public");
  const fields = url.searchParams.get("sysparm_fields")?.trim();
  const supabase = makeClient(authorization);
  const { data, error } = await supabase
    .from(table)
    .select(fields ? fields.split(",").map((f) => f.trim()).join(",") : "*")
    .eq("sys_id", sysId)
    .maybeSingle();
  if (error) return failure(error.message, 400, error.details ?? "");
  if (!data) return failure("No Record found", 404, `Record ${sysId} not found in ${table}`);
  return json({ result: data });
}

export async function createRecord(table: string, body: unknown, authorization: string | null) {
  if (!authorization) return failure("Unauthorized", 401, "Bearer token required for writes");
  const supabase = makeClient(authorization);
  const { data, error } = await supabase.from(table).insert(body as never).select().single();
  if (error) return failure(error.message, 400, error.details ?? "");
  return json({ result: data }, 201);
}

export async function updateRecord(
  table: string,
  sysId: string,
  body: unknown,
  authorization: string | null,
) {
  if (!authorization) return failure("Unauthorized", 401, "Bearer token required for writes");
  const supabase = makeClient(authorization);
  const { data, error } = await supabase
    .from(table)
    .update(body as never)
    .eq("sys_id", sysId)
    .select()
    .maybeSingle();
  if (error) return failure(error.message, 400, error.details ?? "");
  if (!data) return failure("No Record found", 404, `Record ${sysId} not found in ${table}`);
  return json({ result: data });
}

export async function deleteRecord(table: string, sysId: string, authorization: string | null) {
  if (!authorization) return failure("Unauthorized", 401, "Bearer token required for writes");
  const supabase = makeClient(authorization);
  const { error } = await supabase.from(table).delete().eq("sys_id", sysId);
  if (error) return failure(error.message, 400, error.details ?? "");
  return new Response(null, { status: 204 });
}

export type { AnyQuery };