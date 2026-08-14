import { createFileRoute } from "@tanstack/react-router";

import { deleteRecord, failure, getRecord, resolveTable, updateRecord } from "@/lib/snow-table";

export const Route = createFileRoute("/api/public/now/table/$table/$sysId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const table = resolveTable(params.table);
        if (!table) return failure("Invalid table", 404, `Unknown table ${params.table}`);
        return getRecord(
          table,
          params.sysId,
          new URL(request.url),
          request.headers.get("authorization"),
        );
      },
      PATCH: async ({ request, params }) => {
        const table = resolveTable(params.table);
        if (!table) return failure("Invalid table", 404, `Unknown table ${params.table}`);
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return failure("Invalid payload", 400, "Body must be valid JSON");
        }
        return updateRecord(table, params.sysId, body, request.headers.get("authorization"));
      },
      PUT: async ({ request, params }) => {
        const table = resolveTable(params.table);
        if (!table) return failure("Invalid table", 404, `Unknown table ${params.table}`);
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return failure("Invalid payload", 400, "Body must be valid JSON");
        }
        return updateRecord(table, params.sysId, body, request.headers.get("authorization"));
      },
      DELETE: async ({ request, params }) => {
        const table = resolveTable(params.table);
        if (!table) return failure("Invalid table", 404, `Unknown table ${params.table}`);
        return deleteRecord(table, params.sysId, request.headers.get("authorization"));
      },
    },
  },
});