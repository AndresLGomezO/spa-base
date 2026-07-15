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
import {
  loadChartDefinitionsCatalogJson,
  loadCustomViewsCatalogJson,
  loadDataHooksCatalogJson,
  loadEntityDefinitionsCatalogJson,
  loadFormulaDefinitionsCatalogJson,
  loadMetricDefinitionsCatalogJson,
  loadQueryDefinitionsCatalogJson,
} from "./seed-catalog-dir.js";

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

const EMPTY_CATALOG_COUNTS: {
  created: number;
  updated: number;
  deleted: number;
} = {
  created: 0,
  updated: 0,
  deleted: 0,
};

export interface SeedRatesCatalogsOptions {
  readonly entities?: boolean;
  readonly metrics?: boolean;
  readonly queries?: boolean;
  readonly hooks?: boolean;
  readonly formulas?: boolean;
  readonly charts?: boolean;
  readonly customViews?: boolean;
}

export async function seedRatesCatalogs(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  options: SeedRatesCatalogsOptions = {},
): Promise<SeedRatesCatalogsResult> {
  const includeEntities = options.entities ?? true;
  const includeMetrics = options.metrics ?? true;
  const includeQueries = options.queries ?? true;
  const includeHooks = options.hooks ?? true;
  const includeFormulas = options.formulas ?? true;
  const includeCharts = options.charts ?? true;
  const includeCustomViews = options.customViews ?? true;

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

  let entityCounts = { ...EMPTY_CATALOG_COUNTS };
  let definitionRecords: SeedRatesCatalogsResult["definitionRecords"] = [];

  if (includeEntities) {
    const entityParsed = parseEntityDefinitionsCatalogJson(
      loadEntityDefinitionsCatalogJson(),
    );
    if (!entityParsed.ok) {
      throw new Error(
        `Invalid rates entity catalog: ${entityParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
    const entityResult = await replaceEntityDefinitionsCatalog(
      {
        entityRuntime,
        entityCategoryRepository,
      },
      tenantId,
      entityParsed.data,
    );
    entityCounts = entityResult.counts;
    definitionRecords = entityResult.items;
  } else {
    definitionRecords = await entityRuntime.entityDefinitionRepository.list(
      tenantId,
    );
  }

  let queryCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeQueries) {
    const queryParsed = parseEntityQueryDefinitionsCatalogJson(
      loadQueryDefinitionsCatalogJson(),
    );
    if (!queryParsed.ok) {
      throw new Error(
        `Invalid rates query catalog: ${queryParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
    const queryResult = await replaceEntityQueryDefinitionsCatalog(
      {
        entityRuntime,
        entityQueryDefinitionRepository,
        metricDefinitionRepository,
      },
      tenantId,
      queryParsed.data,
    );
    queryCounts = queryResult.counts;
  }

  let metricCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeMetrics) {
    const metricParsed = parseMetricDefinitionsCatalogJson(
      loadMetricDefinitionsCatalogJson(),
    );
    if (!metricParsed.ok) {
      throw new Error(
        `Invalid rates metric catalog: ${metricParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
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
    metricCounts = metricResult.counts;
  }

  let chartCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeCharts) {
    const chartParsed = parseChartDefinitionsCatalogJson(
      loadChartDefinitionsCatalogJson(),
    );
    if (!chartParsed.ok) {
      throw new Error(
        `Invalid rates chart catalog: ${chartParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
    const chartResult = await replaceChartDefinitionsCatalog(
      {
        chartDefinitionRepository,
      },
      tenantId,
      chartParsed.data,
    );
    chartCounts = chartResult.counts;
  }

  let formulaCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeFormulas) {
    const formulasParsed = parseFormulaDefinitionsCatalogJson(
      loadFormulaDefinitionsCatalogJson(),
    );
    if (!formulasParsed.ok) {
      throw new Error(
        `Invalid rates formula catalog: ${formulasParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
    const formulaResult = await replaceFormulasCatalog(
      formulaRuntime,
      tenantId,
      formulasParsed.data,
    );
    formulaCounts = formulaResult.counts;
  }

  let hookCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeHooks) {
    const dataHooksParsed = parseDataHooksCatalogJson(
      loadDataHooksCatalogJson(),
    );
    if (!dataHooksParsed.ok) {
      throw new Error(
        `Invalid rates data hooks catalog: ${dataHooksParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
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
    hookCounts = hookResult.counts;
  }

  let customViewCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeCustomViews) {
    const customViewParsed = parseCustomViewsCatalogJson(
      loadCustomViewsCatalogJson(),
    );
    if (!customViewParsed.ok) {
      throw new Error(
        `Invalid rates custom views catalog: ${customViewParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
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
    customViewCounts = customViewResult.counts;
  }

  console.log(
    `[rates seed] Catalogs: entities +${entityCounts.created}/~${entityCounts.updated}/-${entityCounts.deleted}, metrics +${metricCounts.created}/~${metricCounts.updated}/-${metricCounts.deleted}, queries +${queryCounts.created}/~${queryCounts.updated}/-${queryCounts.deleted}, charts +${chartCounts.created}/~${chartCounts.updated}/-${chartCounts.deleted}, formulas +${formulaCounts.created}/~${formulaCounts.updated}/-${formulaCounts.deleted}, hooks +${hookCounts.created}/~${hookCounts.updated}/-${hookCounts.deleted}, customViews +${customViewCounts.created}/~${customViewCounts.updated}/-${customViewCounts.deleted}`,
  );

  return {
    entityCounts,
    metricCounts,
    queryCounts,
    chartCounts,
    formulaCounts,
    hookCounts,
    customViewCounts,
    definitionRecords,
  };
}
