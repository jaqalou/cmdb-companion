/**
 * Self-service account management. Any signed-in account may view and manage
 * its own record; nothing here can touch another account.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AdminUserRow, AppRole } from "@/lib/admin-users.functions";

export const getOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error) throw new Error(error.message);
    const user = target.user;
    if (!user) throw new Error("Account not found");

    const { data: roleRows, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw new Error(roleError.message);

    return {
      id: user.id,
      email: user.email ?? "—",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      provider: (user.app_metadata?.["provider"] as string) ?? "email",
      roles: ((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role),
    };
  });

export const updateOwnEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email("Enter a valid email address") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email: data.email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ password: z.string().min(12, "Use at least 12 characters").max(128) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: readError } = await supabaseAdmin.auth.admin.getUserById(
      context.userId,
    );
    if (readError) throw new Error(readError.message);
    const providers = (target.user?.app_metadata?.["providers"] as string[] | undefined) ?? [
      (target.user?.app_metadata?.["provider"] as string) ?? "email",
    ];
    if (!providers.includes("email")) {
      throw new Error("This account signs in with single sign-on and has no password to change");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
