"""CB Assets API tokens (Flask backend).

Mirrors src/lib/cmdb-api/token-auth.server.ts. A token looks like
`cba_<8 hex>_<48 hex>`; only its SHA-256 hash is stored in public.api_tokens.
Tokens are not JWTs, so the lookup and the subsequent data access run with the
service key while the caller's roles (read / write / delete) are enforced here.
"""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

TOKEN_RE = re.compile(r"^cba_[0-9a-f]{8}_[0-9a-f]{48}$")
TIMEOUT = 20


@dataclass
class TokenIdentity:
    token_id: str
    user_id: str
    roles: list[str]


def strip_bearer(raw: str | None) -> str:
    return re.sub(r"^Bearer\s+", "", (raw or "").strip(), flags=re.I).strip()


def looks_like_api_token(raw: str | None) -> bool:
    return bool(TOKEN_RE.match(strip_bearer(raw)))


def service_key() -> str | None:
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


def _rest_url() -> str:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or ""
    return url.rstrip("/") + "/rest/v1"


def _admin_headers(key: str) -> dict[str, str]:
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def resolve_api_token(raw: str | None) -> TokenIdentity | None:
    """Return the identity behind a token, or None when it is unknown/revoked/expired."""
    token = strip_bearer(raw)
    if not TOKEN_RE.match(token):
        return None
    key = service_key()
    if not key:
        return None

    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    rows = requests.get(
        f"{_rest_url()}/api_tokens",
        headers=_admin_headers(key),
        params={
            "select": "id,user_id,revoked_at,expires_at",
            "token_hash": f"eq.{digest}",
            "limit": "1",
        },
        timeout=TIMEOUT,
    ).json()
    if not rows:
        return None
    row = rows[0]
    if row.get("revoked_at"):
        return None
    expires = row.get("expires_at")
    if expires:
        try:
            if datetime.fromisoformat(expires.replace("Z", "+00:00")) < datetime.now(timezone.utc):
                return None
        except ValueError:
            pass

    role_rows = requests.get(
        f"{_rest_url()}/user_roles",
        headers=_admin_headers(key),
        params={"select": "role", "user_id": f"eq.{row['user_id']}"},
        timeout=TIMEOUT,
    ).json()

    try:  # best effort; never block the request on the usage stamp
        requests.patch(
            f"{_rest_url()}/api_tokens",
            headers={**_admin_headers(key), "Prefer": "return=minimal"},
            params={"id": f"eq.{row['id']}"},
            json={"last_used_at": datetime.now(timezone.utc).isoformat()},
            timeout=5,
        )
    except requests.RequestException:
        pass

    return TokenIdentity(
        token_id=row["id"],
        user_id=row["user_id"],
        roles=[r["role"] for r in (role_rows or [])],
    )


def can_read(identity: TokenIdentity) -> bool:
    return bool(identity.roles)


def can_write(identity: TokenIdentity) -> bool:
    return "admin" in identity.roles or "editor" in identity.roles


def can_delete(identity: TokenIdentity) -> bool:
    return "admin" in identity.roles


def allows(identity: TokenIdentity, method: str) -> bool:
    method = method.upper()
    if method == "DELETE":
        return can_delete(identity)
    if method in ("GET", "HEAD", "OPTIONS"):
        return can_read(identity)
    return can_write(identity)
