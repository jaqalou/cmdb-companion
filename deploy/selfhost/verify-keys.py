#!/usr/bin/env python3
"""Verify that ANON_KEY and SERVICE_ROLE_KEY are signed with JWT_SECRET.

Usage: verify-keys.py <env-file>
Exit code 0 = keys match the secret, 1 = mismatch (regenerate them).

A mismatch is the cause of "invalid JWT: unable to parse or verify signature,
token signature is invalid" coming back from the accounts and data services.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import sys


def read_env(path: str) -> dict:
    values = {}
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip()
    return values


def signature_ok(token: str, secret: str) -> bool:
    parts = token.split(".")
    if len(parts) != 3:
        return False
    header, body, sig = parts
    expected = hmac.new(
        secret.encode(), f"{header}.{body}".encode(), hashlib.sha256
    ).digest()
    expected_b64 = base64.urlsafe_b64encode(expected).rstrip(b"=").decode()
    return hmac.compare_digest(sig, expected_b64)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: verify-keys.py <env-file>", file=sys.stderr)
        return 2
    env = read_env(sys.argv[1])
    secret = env.get("JWT_SECRET", "")
    if not secret:
        return 1
    for name in ("ANON_KEY", "SERVICE_ROLE_KEY"):
        token = env.get(name, "")
        if not token or not signature_ok(token, secret):
            print(f"{name} does not match JWT_SECRET", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
