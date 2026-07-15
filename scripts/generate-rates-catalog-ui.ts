/**
 * Merges full default UI (views, forms, nav.label, nav.icon) into each Rates
 * entity definition singular JSON. Run after editing field definitions:
 *
 *   pnpm tsx scripts/generate-rates-catalog-ui.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildDefaultUiForNewDefinition } from "@repo/dynamic-entities";
import { validateEntityUIConfig } from "@repo/entities";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import type { EntityDefinitionRecord } from "@repo/dynamic-entities";

const entityDefinitionsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/api/src/admin/rates-tenant/catalogs/entity-definitions",
);

const NAV_ICONS: Record<string, string> = {
  actor: "Building2",
  account: "Landmark",
  category: "FolderTree",
  financialItem: "FileText",
  loanDetails: "ClipboardList",
  loanMonthlyCost: "Shield",
  loanUtilization: "CreditCard",
  incomeDetails: "HandCoins",
  investmentDetails: "LineChart",
  serviceDetails: "Receipt",
  paymentSchedule: "CalendarClock",
  transaction: "ArrowLeftRight",
  balanceSnapshot: "Camera",
  attachment: "Paperclip",
  statement: "FileText",
  email: "Mail",
};

interface SingularEntityEnvelope {
  readonly kind: string;
  readonly version: number;
  data: {
    readonly name: string;
    readonly label: string;
    readonly fields: EntityDefinitionRecord["fields"];
    ui?: unknown;
    [key: string]: unknown;
  };
}

if (!existsSync(entityDefinitionsDir)) {
  throw new Error(`Catalog directory not found: ${entityDefinitionsDir}`);
}

const entityFiles = readdirSync(entityDefinitionsDir)
  .filter(
    (name) =>
      name.endsWith(".json") &&
      !name.startsWith("_") &&
      !name.startsWith("."),
  )
  .sort((a, b) => a.localeCompare(b));

let updated = 0;
for (const fileName of entityFiles) {
  const filePath = join(entityDefinitionsDir, fileName);
  const envelope = JSON.parse(
    readFileSync(filePath, "utf8"),
  ) as SingularEntityEnvelope;
  const definition = envelope.data;

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

  writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  updated += 1;
}

console.log(
  `Updated UI for ${updated} entities in ${entityDefinitionsDir}`,
);
