import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseEntityDefinitionsCatalogJson } from "@repo/dynamic-entities";
import { parseCustomViewsCatalogJson } from "@repo/custom-views";
import { parseMetricDefinitionsCatalogJson } from "@repo/metrics-engine";
import { parseEntityQueryDefinitionsCatalogJson } from "@repo/entity-queries";
import { parseChartDefinitionsCatalogJson } from "@repo/chart-definitions";
import { parseDataHooksCatalogJson } from "@repo/hooks";
import {
  createFirestoreAdminAggregationEventRepository,
  createFirestoreAdminBackfillJobRepository,
  createFirestoreAdminCustomViewRepository,
  createFirestoreAdminDataHookRepository,
  createFirestoreAdminFormulaDefinitionRepository,
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminChartDefinitionRepository,
  createFirestoreAdminMetricContributionRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminMetricValueRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { replaceEntityDefinitionsCatalog } from "../../entities/replace-entity-definitions-catalog.js";
import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import { replaceMetricDefinitionsCatalog } from "../../aggregation/replace-metric-definitions-catalog.js";
import { createMetricRuntimeContext } from "../../aggregation/metric-runtime-context.js";
import {
  createMetricQueryMembershipResolver,
  listSourceDocumentsForMetricDefinition,
} from "../../aggregation/metric-query-runtime.js";
import { replaceEntityQueryDefinitionsCatalog } from "../../entity-queries/replace-entity-query-definitions-catalog.js";
import { replaceChartDefinitionsCatalog } from "../../chart-definitions/replace-chart-definitions-catalog.js";
import { replaceCustomViewsCatalog } from "../../custom-views/replace-custom-views-catalog.js";
import { createHookRuntimeContext } from "../../hooks/hook-runtime-context.js";
import { replaceDataHooksCatalog } from "../../hooks/replace-data-hooks-catalog.js";
import { parseFormulaDefinitionsCatalogJson } from "@repo/formula-definitions";
import { createFormulaRuntimeContext } from "../../formulas/formula-runtime-context.js";
import { replaceFormulasCatalog } from "../../formulas/replace-formulas-catalog.js";

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
  readonly chartCounts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly customViewCounts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly hookCounts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly formulaCounts: {
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

  const chartParsed = parseChartDefinitionsCatalogJson(
    readCatalogJson("rates-chart-definitions.json"),
  );
  if (!chartParsed.ok) {
    throw new Error(
      `Invalid rates chart catalog: ${chartParsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const customViewParsed = parseCustomViewsCatalogJson(
    readCatalogJson("rates-custom-views.json"),
  );
  if (!customViewParsed.ok) {
    throw new Error(
      `Invalid rates custom views catalog: ${customViewParsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const dataHooksParsed = parseDataHooksCatalogJson(
    readCatalogJson("rates-data-hooks.json"),
  );
  if (!dataHooksParsed.ok) {
    throw new Error(
      `Invalid rates data hooks catalog: ${dataHooksParsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const formulasParsed = parseFormulaDefinitionsCatalogJson(
    readCatalogJson("rates-formula-definitions.json"),
  );
  if (!formulasParsed.ok) {
    throw new Error(
      `Invalid rates formula catalog: ${formulasParsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const entityCategoryRepository =
    createFirestoreAdminEntityCategoryRepository(firebaseAdminConfig);
  const metricDefinitionRepository =
    createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig);
  const entityQueryDefinitionRepository =
    createFirestoreAdminEntityQueryDefinitionRepository(firebaseAdminConfig);
  const chartDefinitionRepository =
    createFirestoreAdminChartDefinitionRepository(firebaseAdminConfig);
  const customViewRepository =
    createFirestoreAdminCustomViewRepository(firebaseAdminConfig);
  const dataHookRepository =
    createFirestoreAdminDataHookRepository(firebaseAdminConfig);
  const formulaDefinitionRepository =
    createFirestoreAdminFormulaDefinitionRepository(firebaseAdminConfig);
  const hookRuntime = createHookRuntimeContext(dataHookRepository);
  const formulaRuntime = createFormulaRuntimeContext(
    formulaDefinitionRepository,
  );

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
    listSourceDocuments: (resolvedTenantId, metric) =>
      listSourceDocumentsForMetricDefinition(
        entityRuntime,
        entityQueryDefinitionRepository,
        resolvedTenantId,
        metric,
      ),
    resolveQueryMembership: createMetricQueryMembershipResolver({
      entityRuntime,
      entityQueryDefinitionRepository,
    }),
  });

  const metricResult = await replaceMetricDefinitionsCatalog(
    {
      entityRuntime,
      metricRuntime,
      entityQueryDefinitionRepository,
    },
    tenantId,
    metricParsed.data,
  );

  const queryResult = await replaceEntityQueryDefinitionsCatalog(
    {
      entityRuntime,
      entityQueryDefinitionRepository,
      metricDefinitionRepository,
    },
    tenantId,
    queryParsed.data,
  );

  const chartResult = await replaceChartDefinitionsCatalog(
    {
      chartDefinitionRepository,
    },
    tenantId,
    chartParsed.data,
  );

  const formulaResult = await replaceFormulasCatalog(
    formulaRuntime,
    tenantId,
    formulasParsed.data,
  );

  const hookResult = await replaceDataHooksCatalog(
    {
      entityRuntime,
      hookRepository: dataHookRepository,
      hookRuntime,
      formulaRuntime,
    },
    tenantId,
    dataHooksParsed.data,
  );

  const customViewResult = await replaceCustomViewsCatalog(
    {
      entityRuntime,
      customViewRepository,
      entityQueryDefinitionRepository,
      entityCategoryRepository,
    },
    tenantId,
    customViewParsed.data,
  );

  console.log(
    `[rates seed] Catalogs: entities +${entityResult.counts.created}/~${entityResult.counts.updated}/-${entityResult.counts.deleted}, metrics +${metricResult.counts.created}/~${metricResult.counts.updated}/-${metricResult.counts.deleted}, queries +${queryResult.counts.created}/~${queryResult.counts.updated}/-${queryResult.counts.deleted}, charts +${chartResult.counts.created}/~${chartResult.counts.updated}/-${chartResult.counts.deleted}, formulas +${formulaResult.counts.created}/~${formulaResult.counts.updated}/-${formulaResult.counts.deleted}, hooks +${hookResult.counts.created}/~${hookResult.counts.updated}/-${hookResult.counts.deleted}, customViews +${customViewResult.counts.created}/~${customViewResult.counts.updated}/-${customViewResult.counts.deleted}`,
  );

  return {
    entityCounts: entityResult.counts,
    metricCounts: metricResult.counts,
    queryCounts: queryResult.counts,
    chartCounts: chartResult.counts,
    formulaCounts: formulaResult.counts,
    hookCounts: hookResult.counts,
    customViewCounts: customViewResult.counts,
    definitionRecords: entityResult.items,
  };
}
