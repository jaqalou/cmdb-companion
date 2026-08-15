/**
 * Which REST dialects are served. Both sit on the same core, so migrating from
 * GLPI to ServiceNow is a flag flip here (plus pointing clients at the new URL);
 * no data-access code changes.
 */
export const API_DIALECTS = {
  /** GLPI apirest.php at /api/public/apirest.php/* */
  glpi: true,
  /** ServiceNow Table API at /api/public/now/table/* */
  servicenow: true,
} as const;

export type ApiDialect = keyof typeof API_DIALECTS;
