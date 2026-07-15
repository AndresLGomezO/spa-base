import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  parseDataHookDefinitionJson,
  parseDataHooksCatalogJson,
  type PortableDataHookDefinition,
} from "../index.js";

const dataHooksDir = resolve(
  import.meta.dirname,
  "../../../../apps/api/src/admin/rates-tenant/catalogs/data-hooks",
);

export function loadRatesDataHooksCatalogJson(): string {
  if (!existsSync(dataHooksDir)) {
    throw new Error(`Catalog directory not found: ${dataHooksDir}`);
  }
  const dataHooks = readdirSync(dataHooksDir)
    .filter(
      (name) =>
        name.endsWith(".json") &&
        !name.startsWith("_") &&
        !name.startsWith("."),
    )
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => {
      const parsed = JSON.parse(
        readFileSync(join(dataHooksDir, fileName), "utf8"),
      ) as { data: unknown };
      return parsed.data;
    });
  return JSON.stringify({
    kind: "data-hooks-catalog",
    version: 1,
    exportedAt: new Date().toISOString(),
    dataHooks,
  });
}

export function loadRatesDataHookByFileName(
  fileName: string,
): PortableDataHookDefinition {
  const filePath = join(dataHooksDir, fileName);
  const parsed = parseDataHookDefinitionJson(readFileSync(filePath, "utf8"));
  if (!parsed.ok) {
    throw new Error(
      `Invalid hook ${fileName}: ${parsed.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return parsed.data as PortableDataHookDefinition;
}

export function loadRatesDataHooksCatalog() {
  const parsed = parseDataHooksCatalogJson(loadRatesDataHooksCatalogJson());
  if (!parsed.ok) {
    throw new Error(
      `Invalid rates data hooks catalog: ${parsed.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return parsed.data;
}

export function loadRatesDataHookByName(
  name: string,
): PortableDataHookDefinition {
  const catalog = loadRatesDataHooksCatalog();
  const hook = catalog.dataHooks.find((entry) => entry.name === name);
  if (!hook) {
    throw new Error(`Hook not found: ${name}`);
  }
  return hook;
}
