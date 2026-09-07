/**
 * User & permission administration. Every function verifies the caller holds
 * the admin role through the *authenticated* client (RLS applies) before any
 * privileged Auth Admin call is loaded.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "editor" | "viewer";

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  provider: string;
  roles: AppRole[];
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  // Read the caller's own role rows through the authenticated client (RLS applies).
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Administrator access required");
}

export const listAppUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error(error.message);

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (roleError) throw new Error(roleError.message);

    const byUser = new Map<string, AppRole[]>();
    for (const row of (roleRows ?? []) as { user_id: string; role: AppRole }[]) {
      byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.role]);
    }

    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "—",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      provider: (u.app_metadata?.["provider"] as string) ?? "email",
      roles: byUser.get(u.id) ?? [],
    }));
  });

const roleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const grantUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && data.role === "admin") {
      throw new Error("You cannot remove your own administrator role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const renameInput = z.object({
  userId: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email address"),
});

/** Rename = change the account email (the displayed identity across the app). */
export const renameUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => renameInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own account while signed in");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Roles cascade via the user_roles foreign key; remove explicitly anyway
    // so the audit trail stays tidy if constraints change later.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createInput = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(12, "Use at least 12 characters"),
  role: z.enum(["admin", "editor", "viewer"]),
});

/** Manually provision an account (admin only). Email is pre-confirmed. */
export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Account created but no identifier was returned");
    // The signup trigger seeds a default role; make the chosen role the only one.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleError) throw new Error(roleError.message);
    return { ok: true, userId };
  });
