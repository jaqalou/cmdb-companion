/**
 * API token format and hashing. Tokens are shown once at creation; only the
 * SHA-256 hash is ever stored.
 *
 *   cba_<8 hex prefix>_<48 hex secret>
 *
 * The prefix is stored in clear so a token can be recognised in a list without
 * revealing the secret.
 */
export const TOKEN_PREFIX = "cba";

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function generateApiToken() {
  const prefix = randomHex(4);
  const secret = randomHex(24);
  return { token: `${TOKEN_PREFIX}_${prefix}_${secret}`, prefix };
}

export function isApiToken(value: string) {
  return /^cba_[0-9a-f]{8}_[0-9a-f]{48}$/.test(value.trim());
}

export async function hashApiToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token.trim()));
  return toHex(new Uint8Array(digest));
}
