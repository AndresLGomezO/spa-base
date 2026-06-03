import type {
  DefinedEntity,
  FieldDefinitions,
  NormalizedFieldMeta,
} from "@repo/entities";
import type { MetricDateGranularity } from "@repo/metrics-engine";

interface EntityWithFields {
  readonly metadata: {
    readonly fields: Readonly<Record<string, NormalizedFieldMeta>>;
  };
}

interface MetricDefinitionKeyShape {
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
  readonly dateFieldGranularity: Readonly<
    Record<string, MetricDateGranularity>
  >;
}

export function validateMetricDefinitionDateGranularity(
  entity: EntityWithFields,
  definition: MetricDefinitionKeyShape,
): string | null {
  const keyFields = new Set([...definition.groupBy, ...definition.dimensions]);

  for (const field of keyFields) {
    if (entity.metadata.fields[field]?.type === "date") {
      if (!definition.dateFieldGranularity[field]) {
        return `dateFieldGranularity must include "${field}" because it is a date field in groupBy or dimensions.`;
      }
    }
  }

  for (const field of Object.keys(definition.dateFieldGranularity)) {
    const fieldMeta = entity.metadata.fields[field];
    if (!fieldMeta) {
      continue;
    }
    if (fieldMeta.type !== "date") {
      return `dateFieldGranularity includes "${field}" but it is not a date field.`;
    }
  }

  return null;
}

export function findEntityForSourceModel(
  entities: readonly DefinedEntity<string, FieldDefinitions>[],
  sourceModel: string,
): DefinedEntity<string, FieldDefinitions> | undefined {
  return entities.find((entity) => entity.name === sourceModel);
}
