// Self-hosted installs bake the backend address into the build at install time.
// If the site is later reached through a different address (a domain instead of
// the IP, or HTTPS instead of HTTP), that baked address becomes unreachable and
// every sign-in fails with "Failed to fetch".
//
// On a self-hosted build the backend is always served by the same web server as
// the site itself (/auth/v1/* and /rest/v1/*), so we rewrite those calls onto
// the address the browser is actually using.
const SELF_HOSTED = import.meta.env["VITE_SELFHOSTED"] === "true";

export function applySameOriginBackend() {
  if (!SELF_HOSTED) return;
  if (typeof window === "undefined") return;

  const configured = import.meta.env["VITE_SUPABASE_URL"];
  if (!configured) return;

  let configuredOrigin: string;
  try {
    configuredOrigin = new URL(configured).origin;
  } catch {
    return;
  }
  if (configuredOrigin === window.location.origin) return;

  const globalScope = window as typeof window & { __cbSameOriginBackend?: boolean };
  if (globalScope.__cbSameOriginBackend) return;
  globalScope.__cbSameOriginBackend = true;

  const original = window.fetch.bind(window);
  const rewrite = (url: string) =>
    url.startsWith(configuredOrigin) ? window.location.origin + url.slice(configuredOrigin.length) : url;

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") return original(rewrite(input), init);
    if (input instanceof URL) return original(rewrite(input.toString()), init);
    if (typeof Request !== "undefined" && input instanceof Request) {
      const next = rewrite(input.url);
      return next === input.url ? original(input, init) : original(new Request(next, input), init);
    }
    return original(input as RequestInfo, init);
  }) as typeof window.fetch;
}
