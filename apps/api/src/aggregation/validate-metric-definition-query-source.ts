import {
  collectQueryFilterFieldPaths,
  resolveEntityQueryDefinitionByReference,
  type EntityQueryDefinitionRecord,
} from "@repo/entity-queries";
import type { CreateMetricDefinitionInput } from "@repo/metrics-engine";
import type { EntityQueryDefinitionRepository } from "@repo/firestore-converters";

async function resolveMetricQuerySource(
  repository: EntityQueryDefinitionRepository,
  tenantId: string,
  sourceQueryDefinitionId: string,
): Promise<EntityQueryDefinitionRecord | null> {
  return resolveEntityQueryDefinitionByReference(
    repository,
    tenantId,
    sourceQueryDefinitionId,
  );
}

export function validateMetricQuerySourceEligibility(
  query: EntityQueryDefinitionRecord,
  sourceModel: string,
): string | null {
  if (query.status !== "ACTIVE") {
    return `Query "${query.name}" must be ACTIVE to use as a metric source.`;
  }

  if (query.limitMode !== "all") {
    return `Query "${query.name}" must use limit mode "all" to use as a metric source.`;
  }

  if (query.sourceEntity !== sourceModel) {
    return `sourceModel "${sourceModel}" must match query source entity "${query.sourceEntity}".`;
  }

  return null;
}

async function validateMetricDefinitionQuerySource(
  repository: EntityQueryDefinitionRepository,
  tenantId: string,
  input: Pick<
    CreateMetricDefinitionInput,
    "sourceModel" | "sourceQueryDefinitionId"
  >,
): Promise<string | null> {
  if (!input.sourceQueryDefinitionId) {
    return null;
  }

  const query = await resolveMetricQuerySource(
    repository,
    tenantId,
    input.sourceQueryDefinitionId,
  );
  if (!query) {
    return `Unknown source query definition "${input.sourceQueryDefinitionId}".`;
  }

  return validateMetricQuerySourceEligibility(query, input.sourceModel);
}

function mergeMetricFieldsDependencyWithQuery(
  fieldsDependency: readonly string[],
  query: EntityQueryDefinitionRecord,
): readonly string[] {
  const queryFields = collectQueryFilterFieldPaths(query);
  if (queryFields.length === 0) {
    return fieldsDependency;
  }

  return [...new Set([...fieldsDependency, ...queryFields])];
}

export async function resolveValidatedMetricCreateInput(
  entityQueryDefinitionRepository: EntityQueryDefinitionRepository,
  tenantId: string,
  input: CreateMetricDefinitionInput,
): Promise<
  | { readonly ok: true; readonly input: CreateMetricDefinitionInput }
  | { readonly ok: false; readonly error: string }
> {
  if (input.computationMode === "computed") {
    return { ok: true, input };
  }

  const querySourceError = await validateMetricDefinitionQuerySource(
    entityQueryDefinitionRepository,
    tenantId,
    input,
  );
  if (querySourceError) {
    return { ok: false, error: querySourceError };
  }

  if (!input.sourceQueryDefinitionId) {
    return { ok: true, input };
  }

  const query = await resolveMetricQuerySource(
    entityQueryDefinitionRepository,
    tenantId,
    input.sourceQueryDefinitionId,
  );
  if (!query) {
    return {
      ok: false,
      error: `Unknown source query definition "${input.sourceQueryDefinitionId}".`,
    };
  }

  return {
    ok: true,
    input: {
      ...input,
      sourceQueryDefinitionId: query.id,
      fieldsDependency: [
        ...mergeMetricFieldsDependencyWithQuery(input.fieldsDependency, query),
      ],
    },
  };
}
