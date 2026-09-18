import { supabase } from "@/integrations/supabase/client";

export type SsoProvider = "google";

export const ssoAvailable = import.meta.env["VITE_GOOGLE_SSO"] !== "false";

export type SsoResult = { error?: unknown; redirected?: boolean };

export async function signInWithSso(
  provider: SsoProvider,
  opts: { redirect_uri?: string; extraParams?: Record<string, string> } = {},
): Promise<SsoResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: opts.redirect_uri ?? window.location.origin,
      ...(opts.extraParams ? { queryParams: opts.extraParams } : {}),
    },
  });
  if (error) return { error };
  return { redirected: true };
}
