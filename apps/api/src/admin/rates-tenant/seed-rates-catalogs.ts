import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseEntityDefinitionsCatalogJson } from "@repo/dynamic-entities";
import { parseMetricDefinitionsCatalogJson } from "@repo/metrics-engine";
import { parseEntityQueryDefinitionsCatalogJson } from "@repo/entity-queries";
import {
  createFirestoreAdminAggregationEventRepository,
  createFirestoreAdminBackfillJobRepository,
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminMetricContributionRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminMetricValueRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { replaceEntityDefinitionsCatalog } from "../../entities/replace-entity-definitions-catalog.js";
import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import { replaceMetricDefinitionsCatalog } from "../../aggregation/replace-metric-definitions-catalog.js";
import { createMetricRuntimeContext } from "../../aggregation/metric-runtime-context.js";
import { listSourceDocumentsForMetric } from "../../aggregation/list-source-documents.js";
import { replaceEntityQueryDefinitionsCatalog } from "../../entity-queries/replace-entity-query-definitions-catalog.js";

const CATALOG_DIR = join(dirname(fileURLToPath(import.meta.url)), "catalogs");

function readCatalogJson(filename: string): string {
  return readFileSync(join(CATALOG_DIR, filename), "utf8");
}

interface SeedRatesCatalogsResult {
  readonly entityCounts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly metricCounts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly queryCounts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly definitionRecords: Awaited<
    ReturnType<typeof replaceEntityDefinitionsCatalog>
  >["items"];
}

export async function seedRatesCatalogs(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
): Promise<SeedRatesCatalogsResult> {
  const entityParsed = parseEntityDefinitionsCatalogJson(
    readCatalogJson("rates-entity-definitions.json"),
  );
  if (!entityParsed.ok) {
    throw new Error(
      `Invalid rates entity catalog: ${entityParsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const metricParsed = parseMetricDefinitionsCatalogJson(
    readCatalogJson("rates-metric-definitions.json"),
  );
  if (!metricParsed.ok) {
    throw new Error(
      `Invalid rates metric catalog: ${metricParsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const queryParsed = parseEntityQueryDefinitionsCatalogJson(
    readCatalogJson("rates-query-definitions.json"),
  );
  if (!queryParsed.ok) {
    throw new Error(
      `Invalid rates query catalog: ${queryParsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const entityCategoryRepository =
    createFirestoreAdminEntityCategoryRepository(firebaseAdminConfig);
  const metricDefinitionRepository =
    createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig);
  const entityQueryDefinitionRepository =
    createFirestoreAdminEntityQueryDefinitionRepository(firebaseAdminConfig);

  const entityResult = await replaceEntityDefinitionsCatalog(
    {
      entityRuntime,
      entityCategoryRepository,
    },
    tenantId,
    entityParsed.data,
  );

  const metricRuntime = createMetricRuntimeContext({
    metricDefinitionRepository,
    aggregationEventRepository:
      createFirestoreAdminAggregationEventRepository(firebaseAdminConfig),
    metricValueRepository:
      createFirestoreAdminMetricValueRepository(firebaseAdminConfig),
    backfillJobRepository:
      createFirestoreAdminBackfillJobRepository(firebaseAdminConfig),
    metricContributionRepository:
      createFirestoreAdminMetricContributionRepository(firebaseAdminConfig),
    listSourceDocuments: (resolvedTenantId, sourceModel) =>
      listSourceDocumentsForMetric(
        entityRuntime,
        resolvedTenantId,
        sourceModel,
      ),
  });

  const metricResult = await replaceMetricDefinitionsCatalog(
    {
      entityRuntime,
      metricRuntime,
    },
    tenantId,
    metricParsed.data,
  );

  const queryResult = await replaceEntityQueryDefinitionsCatalog(
    {
      entityRuntime,
      entityQueryDefinitionRepository,
    },
    tenantId,
    queryParsed.data,
  );

  console.log(
    `[rates seed] Catalogs: entities +${entityResult.counts.created}/~${entityResult.counts.updated}/-${entityResult.counts.deleted}, metrics +${metricResult.counts.created}/~${metricResult.counts.updated}/-${metricResult.counts.deleted}, queries +${queryResult.counts.created}/~${queryResult.counts.updated}/-${queryResult.counts.deleted}`,
  );

  return {
    entityCounts: entityResult.counts,
    metricCounts: metricResult.counts,
    queryCounts: queryResult.counts,
    definitionRecords: entityResult.items,
  };
}
