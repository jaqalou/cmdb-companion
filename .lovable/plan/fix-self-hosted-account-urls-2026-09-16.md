# Fix self-hosted account URLs

## Outcome
Account sign-in and user creation will call `/auth/v1/...` on the same server instead of treating the server IP as a URL path.

## Changes
- Normalize `PUBLIC_URL` during installation: trim whitespace and trailing slashes, add `http://` when no protocol is supplied, and reject unsupported or path-bearing values.
- Make the browser-side self-hosted request rewrite tolerate both complete URLs and legacy host-only values already baked into older builds.
- Normalize the persisted backend URL used by the accounts service so redirects remain valid.
- Add an installation-time check showing the exact normalized public address.
- Update the self-hosting troubleshooting note with the accepted `PUBLIC_URL` forms and HTTPS guidance.

## Verification
- Check shell syntax and TypeScript types.
- Test normalization for an IP with and without `http://`, a domain with HTTPS, and trailing slashes.
- Confirm malformed legacy requests such as `/34.60.104.14/auth/v1/signup` are rewritten to `/auth/v1/signup`.
