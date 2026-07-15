import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  parseDataHooksCatalogJson,
  type PortableDataHookDefinition,
} from "@repo/hooks";

const dataHooksDir = resolve(
  import.meta.dirname,
  "../../../../apps/api/src/admin/rates-tenant/catalogs/data-hooks",
);

export function loadRatesDataHookByName(
  name: string,
): PortableDataHookDefinition {
  if (!existsSync(dataHooksDir)) {
    throw new Error(`Catalog directory not found: ${dataHooksDir}`);
  }
  const catalogJson = JSON.stringify({
    kind: "data-hooks-catalog",
    version: 1,
    exportedAt: new Date().toISOString(),
    dataHooks: readdirSync(dataHooksDir)
      .filter(
        (fileName) => fileName.endsWith(".json") && !fileName.startsWith("_"),
      )
      .sort()
      .map(
        (fileName) =>
          (
            JSON.parse(
              readFileSync(join(dataHooksDir, fileName), "utf8"),
            ) as { data: unknown }
          ).data,
      ),
  });
  const parsed = parseDataHooksCatalogJson(catalogJson);
  if (!parsed.ok) {
    throw new Error(
      `Invalid rates data hooks catalog: ${parsed.errors.map((e) => e.message).join("; ")}`,
    );
  }
  const hook = parsed.data.dataHooks.find((entry) => entry.name === name);
  if (!hook) {
    throw new Error(`Hook not found: ${name}`);
  }
  return hook;
}
