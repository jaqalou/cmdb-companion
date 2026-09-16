#!/usr/bin/env python3
"""Generate the API keys the self-hosted stack needs.

Prints shell-style assignments:
    JWT_SECRET=...
    ANON_KEY=...
    SERVICE_ROLE_KEY=...
    POSTGRES_PASSWORD=...

The anon / service_role keys are HS256 JWTs signed with JWT_SECRET, exactly the
shape PostgREST and GoTrue expect. No third-party packages required.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import sys
import time

if sys.version_info < (3, 8):
    sys.exit(
        "CB Assets requires Python 3.8 or newer, but you are running "
        f"{sys.version.split()[0]}.\n"
        "Re-run the installer with 'python3' instead of 'python'."
    )

TEN_YEARS = 60 * 60 * 24 * 365 * 10


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def jwt(payload: dict, secret: str) -> str:
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = b64(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header}.{body}".encode()
    signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    return f"{header}.{body}.{b64(signature)}"


def main() -> int:
    secret = sys.argv[1] if len(sys.argv) > 1 else secrets.token_urlsafe(48)
    now = int(time.time())
    claims = {"iss": "cb-assets", "iat": now, "exp": now + TEN_YEARS}
    print(f"JWT_SECRET={secret}")
    print(f"ANON_KEY={jwt({**claims, 'role': 'anon'}, secret)}")
    print(f"SERVICE_ROLE_KEY={jwt({**claims, 'role': 'service_role'}, secret)}")
    print(f"POSTGRES_PASSWORD={secrets.token_urlsafe(32)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
