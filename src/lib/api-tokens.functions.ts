/**
 * Personal API tokens. Every account can hold its own tokens; administrators
 * can see, issue and revoke tokens for any account.
 *
 * The plaintext token is returned exactly once, at creation time.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateApiToken, hashApiToken } from "@/lib/api-token-hash";

export type ApiTokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  userId: string;
  email: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

type Ctx = { supabase: any; userId: string };

async function isAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

type DbRow = {
  id: string;
  name: string;
  token_prefix: string;
  user_id: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

function shape(row: DbRow, emails: Map<string, string>): ApiTokenRow {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    userId: row.user_id,
    email: emails.get(row.user_id) ?? null,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

export const listApiTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ scope: z.enum(["mine", "all"]).default("mine") }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ tokens: ApiTokenRow[]; isAdmin: boolean }> => {
    const admin = await isAdmin(context);
    const all = data.scope === "all" && admin;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("api_tokens")
      .select("id, name, token_prefix, user_id, created_at, last_used_at, expires_at, revoked_at")
      .order("created_at", { ascending: false });
    if (!all) query = query.eq("user_id", context.userId);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const emails = new Map<string, string>();
    if (all) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      for (const u of list?.users ?? []) if (u.email) emails.set(u.id, u.email);
    }

    return { tokens: ((rows ?? []) as DbRow[]).map((r) => shape(r, emails)), isAdmin: admin };
  });

export const createApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(1, "Give the token a name").max(80),
        expiresInDays: z.number().int().min(1).max(3650).nullable().optional(),
        userId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ token: string; id: string }> => {
    const admin = await isAdmin(context);
    const owner = data.userId ?? context.userId;
    if (owner !== context.userId && !admin) {
      throw new Error("Only administrators can issue tokens for another account");
    }

    const { token, prefix } = generateApiToken();
    const tokenHash = await hashApiToken(token);
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString()
      : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("api_tokens")
      .insert({
        user_id: owner,
        name: data.name,
        token_prefix: prefix,
        token_hash: tokenHash,
        created_by: context.userId,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { token, id: inserted.id };
  });

export const revokeApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readError } = await supabaseAdmin
      .from("api_tokens")
      .select("id, user_id, revoked_at")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Token not found");
    if (row.user_id !== context.userId && !admin) {
      throw new Error("You can only revoke your own tokens");
    }

    const { error } = await supabaseAdmin
      .from("api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readError } = await supabaseAdmin
      .from("api_tokens")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Token not found");
    if (row.user_id !== context.userId && !admin) {
      throw new Error("You can only remove your own tokens");
    }

    const { error } = await supabaseAdmin.from("api_tokens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
