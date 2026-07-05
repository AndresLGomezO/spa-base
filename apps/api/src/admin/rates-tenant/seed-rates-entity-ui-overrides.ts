import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  defineEntityFromRecord,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import {
  validateEntityUIConfig,
  type EntityUIConfig,
  type PutEntityUiOverrideInput,
} from "@repo/entities";
import {
  createFirestoreAdminEntityUiOverrideRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import { z } from "zod";

import {
  injectMetricWidgetChartRefs,
  resolveMetricWidgetChartRefs,
} from "./resolve-metric-widget-chart-refs.js";

const CATALOG_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
  "rates-entity-ui-overrides.json",
);

const metricWidgetCatalogSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    layout: z.unknown(),
  })
  .strict();

const entityUiOverridesCatalogSchema = z
  .object({
    kind: z.literal("entity-ui-overrides-catalog"),
    version: z.literal(1),
    exportedAt: z.string().optional(),
    description: z.string().optional(),
    overrides: z
      .array(
        z
          .object({
            entityName: z.string().trim().min(1),
            views: z.array(z.unknown()).min(1),
            listViewType: z
              .enum(["table", "card", "expandableTable", "compact"])
              .optional(),
            metricWidgets: z.array(metricWidgetCatalogSchema).optional(),
            metricRowLayout: z.unknown().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export function parseRatesEntityUiOverridesCatalog(
  jsonText: string,
): z.infer<typeof entityUiOverridesCatalogSchema> {
  const parsed = entityUiOverridesCatalogSchema.parse(JSON.parse(jsonText));
  for (const override of parsed.overrides) {
    if (override.metricRowLayout) {
      uiLayoutDocumentSchema.parse(override.metricRowLayout);
    }
    if (override.metricWidgets) {
      for (const widget of override.metricWidgets) {
        uiLayoutDocumentSchema.parse(widget.layout);
      }
    }
  }
  return parsed;
}

export async function seedRatesEntityUiOverrides(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
): Promise<{ readonly seeded: number }> {
  const catalogJson = readFileSync(CATALOG_PATH, "utf8");
  const catalog = parseRatesEntityUiOverridesCatalog(catalogJson);
  const chartRefsByRowId = await resolveMetricWidgetChartRefs(
    tenantId,
    firebaseAdminConfig,
  );
  const repository =
    createFirestoreAdminEntityUiOverrideRepository(firebaseAdminConfig);

  const definitionByName = new Map(
    definitionRecords.map((record) => [record.name, record]),
  );

  let seeded = 0;
  for (const override of catalog.overrides) {
    const definition = definitionByName.get(override.entityName);
    if (!definition) {
      console.warn(
        `[seed] Skipping UI override for unknown entity "${override.entityName}".`,
      );
      continue;
    }

    const entity = defineEntityFromRecord(definition);
    const { entityName, ...input } = override;

    const resolvedInput = {
      ...input,
      metricWidgets: injectMetricWidgetChartRefs(
        input.metricWidgets as PutEntityUiOverrideInput["metricWidgets"],
        chartRefsByRowId,
      ),
    } as PutEntityUiOverrideInput;

    validateEntityUIConfig(entity, {
      ...(definition.ui ?? {}),
      ...resolvedInput,
    } as EntityUIConfig);

    await repository.put(tenantId, entityName, resolvedInput);
    seeded += 1;
    console.log(
      `[seed]   entity UI override: ${entityName} (${override.metricWidgets?.length ?? 0} metric widget(s))`,
    );
  }

  return { seeded };
}
