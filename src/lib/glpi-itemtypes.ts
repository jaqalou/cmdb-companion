/** GLPI itemtype <-> CMDB table mapping (client-safe, no server imports). */
import { CI_CLASSES, resolveGlpiItemtype } from "./cmdb-api/classes";

export const ITEMTYPES: Record<string, string> = Object.fromEntries(
  CI_CLASSES.map((c) => [c.itemtype, c.table]),
);

export const TABLE_TO_ITEMTYPE: Record<string, string> = Object.fromEntries(
  CI_CLASSES.map((c) => [c.table, c.itemtype]),
);

/** Case-insensitive itemtype lookup, as GLPI accepts `Computer` and `computer`. */
export function resolveItemtype(name: string): { itemtype: string; table: string } | null {
  const hit = resolveGlpiItemtype(name);
  return hit ? { itemtype: hit.itemtype, table: hit.table } : null;
}
