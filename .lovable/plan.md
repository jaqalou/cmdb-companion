# Fix persistent invalid sign-in sessions

## Changes
- Repair generated API keys from the existing signing secret instead of rotating that secret, so valid user sessions remain valid.
- When backend keys change, synchronize the live website and API service settings automatically.
- Restart affected services after synchronization and report whether users must sign in again.
- Add a setup-time consistency check so a website/backend key mismatch cannot silently recur.

## Validation
- Check the installer and setup scripts for shell syntax errors.
- Verify key repair produces keys signed by the original secret.
- Confirm the live settings synchronization updates both public and privileged keys without changing database credentials.
