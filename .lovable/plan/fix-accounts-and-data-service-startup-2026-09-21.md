# Fix accounts and data service startup

## What will change
- Make database mode selection explicit so an old existing-database relay cannot remain active when bundled PostgreSQL is selected.
- Add the compatibility database role required by the accounts service’s own migrations, including databases whose administrator has another name.
- Replace the misleading “tables exist / container is running” checks with an actual accounts endpoint readiness check before starting or validating the gateway.
- Recreate the accounts and data containers when their database target changes, preventing stale connection settings.
- Improve failure output so it reports the current container state and the newest accounts/data-service error rather than historical noise.

## Validation
- Check the compose configuration for both bundled and existing database modes.
- Run shell syntax validation and focused configuration checks.
- Confirm startup cannot report success while `/auth/v1/token` or the data API upstream is still unavailable.

## Technical details
- Changes are limited to `deploy/selfhost/up.sh`, `deploy/selfhost/docker-compose.yml`, and the self-hosted bootstrap SQL if required.
- Bundled PostgreSQL remains published on host port 5432 as requested.
