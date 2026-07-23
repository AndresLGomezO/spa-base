import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLocalTenantCatalogsDir } from "./load-tenant-config.js";

/**
 * Discover entity `name` fields from singular entity-definition envelopes
 * under `.local/tenant-import/catalogs/entity-definitions/`.
 */
export function listLocalTenantEntityNames(
  startDir: string = process.cwd(),
): readonly string[] {
  const entityDir = join(
    resolveLocalTenantCatalogsDir(startDir),
    "entity-definitions",
  );
  if (!existsSync(entityDir)) {
    return [];
  }

  const names: string[] = [];
  for (const fileName of readdirSync(entityDir).sort()) {
    if (
      !fileName.endsWith(".json") ||
      fileName.startsWith("_") ||
      fileName.startsWith(".")
    ) {
      continue;
    }
    const parsed: unknown = JSON.parse(
      readFileSync(join(entityDir, fileName), "utf8"),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      continue;
    }
    const data = (parsed as { data?: unknown }).data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      continue;
    }
    const name = (data as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) {
      names.push(name);
    }
  }
  return names;
}
