/**
 * Merges full default UI (views, forms, nav.label, nav.icon) into the Rates
 * entity catalog. Run after editing field definitions:
 *
 *   pnpm tsx scripts/generate-rates-catalog-ui.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildDefaultUiForNewDefinition } from "@repo/dynamic-entities";
import { validateEntityUIConfig } from "@repo/entities";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import type { EntityDefinitionRecord } from "@repo/dynamic-entities";

const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/api/src/admin/rates-tenant/catalogs/rates-entity-definitions.json",
);

const NAV_ICONS: Record<string, string> = {
  actor: "Building2",
  account: "Landmark",
  category: "FolderTree",
  financialItem: "FileText",
  loanDetails: "ClipboardList",
  incomeDetails: "HandCoins",
  investmentDetails: "LineChart",
  serviceDetails: "Receipt",
  paymentSchedule: "CalendarClock",
  transaction: "ArrowLeftRight",
  balanceSnapshot: "Camera",
};

interface CatalogEnvelope {
  readonly kind: string;
  readonly version: number;
  readonly exportedAt: string;
  readonly entityCategories: readonly unknown[];
  readonly entityDefinitions: Array<{
    readonly name: string;
    readonly label: string;
    readonly fields: EntityDefinitionRecord["fields"];
    ui?: unknown;
    [key: string]: unknown;
  }>;
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogEnvelope;

for (const definition of catalog.entityDefinitions) {
  const navIcon = NAV_ICONS[definition.name];
  if (!navIcon) {
    throw new Error(`Missing nav icon mapping for entity "${definition.name}"`);
  }

  definition.ui = buildDefaultUiForNewDefinition({
    label: definition.label,
    fields: definition.fields,
    navIcon,
  });

  const record: EntityDefinitionRecord = {
    id: "preview",
    tenantId: "preview",
    name: definition.name,
    label: definition.label,
    fields: definition.fields,
    ui: definition.ui as EntityDefinitionRecord["ui"],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const entity = defineEntityFromRecord(record);
  validateEntityUIConfig(entity, definition.ui as EntityDefinitionRecord["ui"]);
}

writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Updated UI for ${catalog.entityDefinitions.length} entities in ${catalogPath}`);
