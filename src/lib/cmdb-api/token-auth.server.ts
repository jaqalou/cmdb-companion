/**
 * Resolves a CB Assets API token (cba_…) into an identity plus its roles.
 *
 * API tokens are not JWTs, so PostgreSQL cannot evaluate row level security for
 * them. The token is therefore resolved here and the resulting role set is
 * enforced in the API layer, mirroring the RLS policies exactly:
 *   read    — any role
 *   write   — admin or editor
 *   delete  — admin only
 */
import { hashApiToken, isApiToken } from "@/lib/api-token-hash";

export type AppRole = "admin" | "editor" | "viewer";

export type ApiIdentity = {
  tokenId: string;
  userId: string;
  roles: AppRole[];
};

export function looksLikeApiToken(raw: string | null | undefined) {
  if (!raw) return false;
  return isApiToken(raw.replace(/^Bearer\s+/i, ""));
}

export async function resolveApiToken(raw: string): Promise<ApiIdentity | null> {
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  if (!isApiToken(token)) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await hashApiToken(token);

  const { data: row, error } = await supabaseAdmin
    .from("api_tokens")
    .select("id, user_id, revoked_at, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error || !row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", row.user_id);

  void supabaseAdmin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => undefined);

  return {
    tokenId: row.id,
    userId: row.user_id,
    roles: ((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role),
  };
}

export function canRead(identity: ApiIdentity) {
  return identity.roles.length > 0;
}

export function canWrite(identity: ApiIdentity) {
  return identity.roles.includes("admin") || identity.roles.includes("editor");
}

export function canDelete(identity: ApiIdentity) {
  return identity.roles.includes("admin");
}
