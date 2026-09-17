import { createFileRoute } from "@tanstack/react-router";

import { API_DIALECTS } from "@/lib/cmdb-api/config";
import {
  resolveSnowTable,
  snowDelete,
  snowError,
  snowGet,
  snowInsert,
  snowList,
  snowUpdate,
} from "@/lib/servicenow-api";
import {
  addItems,
  deleteItem,
  getItem,
  getItems,
  glpiError,
  json,
  listSearchOptions,
  resolveItemtype,
  searchItems,
  sessionToken,
  updateItem,
} from "@/lib/glpi-api";

type Ctx = { request: Request; params: { _splat?: string } };

function segments(params: { _splat?: string }) {
  return (params._splat ?? "").split("/").filter(Boolean);
}

const NOT_FOUND = () =>
  glpiError("ERROR_RESOURCE_NOT_FOUND", "Unknown GLPI endpoint", 404);

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

type Auth = { token: string | null; denied?: Response };

/**
 * Accepts both credentials: an account bearer JWT (row level security applies
 * in PostgreSQL) or a CB Assets API token, whose roles are resolved here and
 * enforced with the same read / write / delete rules.
 */
async function authenticate(request: Request): Promise<Auth> {
  const raw = request.headers.get("authorization") ?? request.headers.get("session-token");
  const candidate = (raw ?? "").replace(/^Bearer\s+/i, "").trim();
  const { isApiToken } = await import("@/lib/api-token-hash");
  if (!isApiToken(candidate)) return { token: sessionToken(request) };

  const { resolveApiToken, canRead, canWrite, canDelete } = await import(
    "@/lib/cmdb-api/token-auth.server"
  );
  const { SERVICE_TOKEN } = await import("@/lib/cmdb-api/core");

  const identity = await resolveApiToken(candidate);
  if (!identity) {
    return {
      token: null,
      denied: glpiError(
        "ERROR_SESSION_TOKEN_INVALID",
        "This API token is unknown, revoked or expired",
        401,
      ),
    };
  }

  const method = request.method.toUpperCase();
  const allowed =
    method === "DELETE"
      ? canDelete(identity)
      : method === "GET"
        ? canRead(identity)
        : canWrite(identity);
  if (!allowed) {
    return {
      token: null,
      denied: glpiError(
        "ERROR_RIGHT_MISSING",
        "The account behind this API token may not perform this action",
        403,
      ),
    };
  }

  return { token: SERVICE_TOKEN };
}

async function handler({ request, params }: Ctx) {
  const parts = segments(params);
  const url0 = new URL(request.url);
  const auth = await authenticate(request);
  if (auth.denied) return auth.denied;
  const token0 = auth.token;


  // Health probe: /api/public/health — mirrors the self-hosted Flask backend.
  if (parts[0] === "health" && parts.length === 1) {
    const { CI_CLASSES } = await import("@/lib/cmdb-api/classes");
    return json({
      status: "ok",
      dialects: API_DIALECTS,
      classes: CI_CLASSES.map((c) => ({
        table: c.table,
        itemtype: c.itemtype,
        snow_table: c.snowTable,
        label: c.label,
      })),
    });
  }

  // ServiceNow Table API: /api/public/now/table/{table}[/{sys_id}]
  if (parts[0] === "now") {
    if (!API_DIALECTS.servicenow)
      return snowError("Not available", "ServiceNow dialect is disabled", 404);
    if (parts[1] !== "table" || !parts[2])
      return snowError("Invalid endpoint", "Expected /api/public/now/table/{table}", 404);
    const cls = resolveSnowTable(parts[2]);
    if (!cls) return snowError("Invalid table", `Table ${parts[2]} is not exposed`, 404);
    const sysId = parts[3];
    switch (request.method.toUpperCase()) {
      case "GET":
        return sysId
          ? snowGet(cls.table, sysId, url0, token0)
          : snowList(cls.table, url0, token0);
      case "POST":
        return snowInsert(cls.table, await readBody(request), token0);
      case "PUT":
      case "PATCH":
        if (!sysId) return snowError("Invalid request", "A sys_id is required for updates", 400);
        return snowUpdate(cls.table, sysId, await readBody(request), token0);
      case "DELETE":
        if (!sysId) return snowError("Invalid request", "A sys_id is required for deletes", 400);
        return snowDelete(cls.table, sysId, token0);
      default:
        return snowError("Method not allowed", request.method, 405);
    }
  }

  if (parts[0] !== "apirest.php") return NOT_FOUND();
  if (!API_DIALECTS.glpi)
    return glpiError("ERROR_RESOURCE_NOT_FOUND", "GLPI dialect is disabled", 404);

  const url = url0;
  const token = token0;
  const method = request.method.toUpperCase();
  const [, first, second, third] = parts;

  if (first === "initSession") {
    const presented = (
      request.headers.get("authorization") ??
      request.headers.get("session-token") ??
      ""
    ).replace(/^Bearer\s+/i, "");
    if (!presented)
      return glpiError(
        "ERROR_LOGIN_PARAMETERS_MISSING",
        "Provide an Authorization bearer token or a CB Assets API token",
        401,
      );
    return json({ session_token: presented });
  }

  if (first === "killSession") return json({});
  if (first === "getMyProfiles" || first === "getActiveProfile") {
    if (!token) return glpiError("ERROR_SESSION_TOKEN_INVALID", "Session token required", 401);
    return json({ myprofiles: [{ id: 1, name: "CB Assets" }] });
  }

  if (first === "listSearchOptions") {
    const target = second ? resolveItemtype(second) : null;
    if (!target) return glpiError("ERROR_ITEMTYPE_NOT_FOUND", `Unknown itemtype ${second}`, 404);
    return listSearchOptions(target.table, token);
  }

  if (first === "search") {
    const target = second ? resolveItemtype(second) : null;
    if (!target) return glpiError("ERROR_ITEMTYPE_NOT_FOUND", `Unknown itemtype ${second}`, 404);
    if (method !== "GET") return NOT_FOUND();
    return searchItems(target.table, url, token);
  }

  const target = first ? resolveItemtype(first) : null;
  if (!target) return glpiError("ERROR_ITEMTYPE_NOT_FOUND", `Unknown itemtype ${first}`, 404);
  if (third) return NOT_FOUND();
  const id = second;

  switch (method) {
    case "GET":
      return id ? getItem(target.table, id, url, token) : getItems(target.table, url, token);
    case "POST":
      return addItems(target.table, await readBody(request), token);
    case "PUT":
    case "PATCH": {
      if (!id) return glpiError("ERROR_BAD_ARRAY", "An item id is required for updates", 400);
      return updateItem(target.table, id, await readBody(request), token);
    }
    case "DELETE":
      if (!id) return glpiError("ERROR_BAD_ARRAY", "An item id is required for deletes", 400);
      return deleteItem(target.table, id, token);
    default:
      return NOT_FOUND();
  }
}

export const Route = createFileRoute("/api/public/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      PATCH: handler,
      DELETE: handler,
    },
  },
});
