import { createFileRoute } from "@tanstack/react-router";

import { createRecord, failure, listRecords, resolveTable } from "@/lib/snow-table";

export const Route = createFileRoute("/api/public/now/table/$table")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const table = resolveTable(params.table);
        if (!table) return failure("Invalid table", 404, `Unknown table ${params.table}`);
        return listRecords(table, new URL(request.url));
      },
      POST: async ({ request, params }) => {
        const table = resolveTable(params.table);
        if (!table) return failure("Invalid table", 404, `Unknown table ${params.table}`);
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return failure("Invalid payload", 400, "Body must be valid JSON");
        }
        return createRecord(table, body, request.headers.get("authorization"));
      },
    },
  },
});