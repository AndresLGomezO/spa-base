import { z } from "zod";

import { entityUiOverrideRecordSchema } from "./entity-ui-override-schema.js";
import type { EntityUiOverrideRecord } from "./types.js";

export const persistedEntityUiOverrideSchema = z
  .object({
    entityName: z.string().trim().min(1),
    updatedAt: z.string().datetime(),
    viewsJson: z.string().min(2),
    listViewType: z
      .enum(["table", "card", "expandableTable", "compact"])
      .optional(),
    listItemLayoutJson: z.string().min(2).optional(),
    mainPageLayoutJson: z.string().min(2).optional(),
    recordDetailLayoutJson: z.string().min(2).optional(),
    metricWidgetsJson: z.string().min(2).optional(),
    metricRowLayoutJson: z.string().min(2).optional(),
    formsJson: z.string().min(2).optional(),
    formDesignsJson: z.string().min(2).optional(),
    entityPageCreateFormDesignId: z.string().trim().min(1).optional(),
    entityPageEditFormDesignId: z.string().trim().min(1).optional(),
  })
  .strict();

export type PersistedEntityUiOverride = z.infer<
  typeof persistedEntityUiOverrideSchema
>;

function parseJsonField<T>(json: string, fieldName: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(
      `Invalid JSON in persisted UI override field "${fieldName}".`,
    );
  }
}

export function toPersistedUiOverride(
  record: EntityUiOverrideRecord,
): PersistedEntityUiOverride {
  const recordDetail = record.recordDetail ?? record.detail;

  return persistedEntityUiOverrideSchema.parse({
    entityName: record.entityName,
    updatedAt: record.updatedAt,
    viewsJson: JSON.stringify(record.views),
    ...(record.listViewType ? { listViewType: record.listViewType } : {}),
    ...(record.listItem
      ? { listItemLayoutJson: JSON.stringify(record.listItem) }
      : {}),
    ...(record.mainPage
      ? { mainPageLayoutJson: JSON.stringify(record.mainPage) }
      : {}),
    ...(recordDetail
      ? { recordDetailLayoutJson: JSON.stringify(recordDetail) }
      : {}),
    ...(record.metricWidgets
      ? { metricWidgetsJson: JSON.stringify(record.metricWidgets) }
      : {}),
    ...(record.metricRowLayout
      ? { metricRowLayoutJson: JSON.stringify(record.metricRowLayout) }
      : {}),
    ...(record.forms ? { formsJson: JSON.stringify(record.forms) } : {}),
    ...(record.formDesigns
      ? { formDesignsJson: JSON.stringify(record.formDesigns) }
      : {}),
    ...(record.entityPageCreateFormDesignId
      ? { entityPageCreateFormDesignId: record.entityPageCreateFormDesignId }
      : {}),
    ...(record.entityPageEditFormDesignId
      ? { entityPageEditFormDesignId: record.entityPageEditFormDesignId }
      : {}),
  });
}

function toDomainRecord(
  data: PersistedEntityUiOverride,
): EntityUiOverrideRecord {
  return entityUiOverrideRecordSchema.parse({
    entityName: data.entityName,
    updatedAt: data.updatedAt,
    views: parseJsonField(data.viewsJson, "viewsJson"),
    ...(data.listViewType ? { listViewType: data.listViewType } : {}),
    ...(data.listItemLayoutJson
      ? {
          listItem: parseJsonField(
            data.listItemLayoutJson,
            "listItemLayoutJson",
          ),
        }
      : {}),
    ...(data.mainPageLayoutJson
      ? {
          mainPage: parseJsonField(
            data.mainPageLayoutJson,
            "mainPageLayoutJson",
          ),
        }
      : {}),
    ...(data.recordDetailLayoutJson
      ? {
          recordDetail: parseJsonField(
            data.recordDetailLayoutJson,
            "recordDetailLayoutJson",
          ),
        }
      : {}),
    ...(data.metricWidgetsJson
      ? {
          metricWidgets: parseJsonField(
            data.metricWidgetsJson,
            "metricWidgetsJson",
          ),
        }
      : {}),
    ...(data.metricRowLayoutJson
      ? {
          metricRowLayout: parseJsonField(
            data.metricRowLayoutJson,
            "metricRowLayoutJson",
          ),
        }
      : {}),
    ...(data.formsJson
      ? { forms: parseJsonField(data.formsJson, "formsJson") }
      : {}),
    ...(data.formDesignsJson
      ? {
          formDesigns: parseJsonField(data.formDesignsJson, "formDesignsJson"),
        }
      : {}),
    ...(data.entityPageCreateFormDesignId
      ? { entityPageCreateFormDesignId: data.entityPageCreateFormDesignId }
      : {}),
    ...(data.entityPageEditFormDesignId
      ? { entityPageEditFormDesignId: data.entityPageEditFormDesignId }
      : {}),
  }) as EntityUiOverrideRecord;
}

export function fromPersistedUiOverride(data: unknown): EntityUiOverrideRecord {
  const persisted = persistedEntityUiOverrideSchema.parse(data);
  return toDomainRecord(persisted);
}

/** Returns null when persisted data is missing or cannot be restored. */
export function safeFromPersistedUiOverride(
  data: unknown,
): EntityUiOverrideRecord | null {
  const persisted = persistedEntityUiOverrideSchema.safeParse(data);
  if (!persisted.success) {
    return null;
  }

  try {
    return toDomainRecord(persisted.data);
  } catch {
    return null;
  }
}
