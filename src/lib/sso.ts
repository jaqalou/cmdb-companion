// Thin wrapper around the SSO integration so app code never imports the
// generated integration module directly.
//
// The managed (Lovable-hosted) build signs in through the managed OAuth
// endpoint. A self-hosted install has no such endpoint — that request comes
// back as 404 /~oauth/initiate — so there we hand off to the accounts service
// running on the VM, which redirects the browser to Google itself.
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export type SsoProvider = "google";

const SELF_HOSTED = import.meta.env["VITE_SELFHOSTED"] === "true";

export const ssoAvailable =
  !SELF_HOSTED || import.meta.env["VITE_GOOGLE_SSO"] === "true";

export async function signInWithSso(
  provider: SsoProvider,
  opts: { redirect_uri?: string; extraParams?: Record<string, string> } = {},
) {
  if (SELF_HOSTED) {
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

  return lovable.auth.signInWithOAuth(provider, opts);
}
