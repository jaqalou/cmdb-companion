# Remove Lovable references

## Scope
- Remove Lovable-named application dependencies, imports, comments, messages, and integration modules.
- Replace the branded build wrapper with the standard TanStack Start, React, Tailwind, path-alias, and Nitro configuration.
- Send Google sign-in directly through the configured authentication service for both hosted and self-hosted installs.
- Replace branded error-reporting hooks with neutral browser error reporting.
- Refresh dependency records and verify no remaining references exist outside platform-generated authentication support files that are protected from manual editing.

## Technical details
- Preserve the existing Node self-host preset and Cloudflare-compatible default build target.
- Preserve Vite port 8080, aliases, dependency deduplication, and import protection.
- Remove the branded cloud-auth and build-config packages from the dependency manifest.
- Do not alter database data, API behavior, permissions, or page design.

## Verification
- Search the maintained source, deployment files, and documentation for branded terms.
- Run the existing automated build validation and inspect the sign-in path for regressions.
