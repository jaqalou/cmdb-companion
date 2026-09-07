// Thin wrapper around the managed SSO integration so app code never imports
// the generated integration module directly.
import { lovable } from "@/integrations/lovable";

export type SsoProvider = "google";

export async function signInWithSso(
  provider: SsoProvider,
  opts: { redirect_uri?: string; extraParams?: Record<string, string> } = {},
) {
  return lovable.auth.signInWithOAuth(provider, opts);
}
