import { createFileRoute } from "@tanstack/react-router";

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

async function handler({ request, params }: Ctx) {
  const parts = segments(params);
  if (parts[0] !== "apirest.php") return NOT_FOUND();

  const url = new URL(request.url);
  const token = sessionToken(request);
  const method = request.method.toUpperCase();
  const [, first, second, third] = parts;

  if (first === "initSession") {
    if (!token)
      return glpiError(
        "ERROR_LOGIN_PARAMETERS_MISSING",
        "Provide an Authorization bearer token for a CB Assets account",
        401,
      );
    return json({ session_token: token.replace(/^Bearer\s+/i, "") });
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
      return (await import("@/lib/glpi-api")).updateItem(
        target.table,
        id,
        await readBody(request),
        token,
      );
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

export { addItems, deleteItem, getItem, getItems, searchItems };
