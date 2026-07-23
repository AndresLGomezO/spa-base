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
import { loadEntityUiOverridesCatalogJson } from "./seed-catalog-dir.js";

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
              .enum(["card", "expandableTable", "compact"])
              .optional(),
            listItem: z.unknown().optional(),
            metricWidgets: z.array(metricWidgetCatalogSchema).optional(),
            metricRowLayout: z.unknown().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

type CatalogListViewType = z.infer<
  typeof entityUiOverridesCatalogSchema
>["overrides"][number]["listViewType"];

function normalizeCatalogListViewType(
  listViewType: unknown,
): CatalogListViewType {
  if (listViewType === "table") {
    return "expandableTable";
  }
  if (
    listViewType === "card" ||
    listViewType === "expandableTable" ||
    listViewType === "compact"
  ) {
    return listViewType;
  }
  return undefined;
}

function preprocessEntityUiOverridesCatalog(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const catalog = raw as Record<string, unknown>;
  if (!Array.isArray(catalog.overrides)) {
    return raw;
  }
  return {
    ...catalog,
    overrides: catalog.overrides.map((override) => {
      if (!override || typeof override !== "object") {
        return override;
      }
      const record = override as Record<string, unknown>;
      const listViewType = normalizeCatalogListViewType(record.listViewType);
      if (listViewType === undefined) {
        const rest = { ...record };
        delete rest.listViewType;
        return rest;
      }
      return { ...record, listViewType };
    }),
  };
}

export function parseLocalEntityUiOverridesCatalog(
  jsonText: string,
): z.infer<typeof entityUiOverridesCatalogSchema> {
  const parsed = entityUiOverridesCatalogSchema.parse(
    preprocessEntityUiOverridesCatalog(JSON.parse(jsonText)),
  );
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

export async function seedLocalEntityUiOverrides(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
): Promise<{ readonly seeded: number }> {
  const catalog = parseLocalEntityUiOverridesCatalog(
    loadEntityUiOverridesCatalogJson(),
  );
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
