import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Merge singular `{ kind, version, data }` JSON files in a directory into a
 * catalog envelope JSON string. Files starting with `_` are skipped (meta).
 */
export function mergeSingularCatalogDir(
  dirPath: string,
  catalog: {
    readonly kind: string;
    readonly version: number;
    readonly itemsKey: string;
    readonly exportedAt?: boolean;
    readonly extra?: Record<string, unknown>;
  },
): string {
  if (!existsSync(dirPath)) {
    throw new Error(`Catalog directory not found: ${dirPath}`);
  }

  const items = readdirSync(dirPath)
    .filter(
      (name) =>
        name.endsWith(".json") &&
        !name.startsWith("_") &&
        !name.startsWith("."),
    )
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => {
      const filePath = join(dirPath, fileName);
      const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`Expected singular envelope object in ${filePath}.`);
      }
      const data = (parsed as { data?: unknown }).data;
      if (data === undefined) {
        throw new Error(`Missing data in singular envelope ${filePath}.`);
      }
      return data;
    });

  return JSON.stringify({
    kind: catalog.kind,
    version: catalog.version,
    ...(catalog.exportedAt === false
      ? {}
      : { exportedAt: new Date().toISOString() }),
    ...(catalog.extra ?? {}),
    [catalog.itemsKey]: items,
  });
}

export function readEntityCategoriesMeta(
  entityDefinitionsDir: string,
): unknown[] | undefined {
  const categoriesPath = join(entityDefinitionsDir, "_categories.json");
  if (!existsSync(categoriesPath)) {
    return undefined;
  }
  const meta: unknown = JSON.parse(readFileSync(categoriesPath, "utf8"));
  if (
    meta &&
    typeof meta === "object" &&
    !Array.isArray(meta) &&
    Array.isArray((meta as { entityCategories?: unknown }).entityCategories)
  ) {
    return (meta as { entityCategories: unknown[] }).entityCategories;
  }
  return undefined;
}
