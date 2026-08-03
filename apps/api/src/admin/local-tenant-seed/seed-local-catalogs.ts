import {
  parseDocumentExtractionTemplatesCatalogJson,
  parseInsightSurfacesCatalogJson,
} from "@repo/ai-context";
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
  createFirestoreAdminDocumentExtractionTemplateRepository,
  createFirestoreAdminFormulaDefinitionRepository,
  createFirestoreAdminLocalePackRepository,
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminEntityUiOverrideRepository,
  createFirestoreAdminChartDefinitionRepository,
  createFirestoreAdminInsightSurfaceRepository,
  createFirestoreAdminMetricContributionRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminMetricValueRepository,
  createFirestoreAdminTenantDashboardLayoutRepository,
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantSidebarLayoutRepository,
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
import { replaceInsightSurfacesCatalog } from "../../ai/replace-insight-surfaces-catalog.js";
import { replaceDocumentExtractionTemplatesCatalog } from "../../ai/replace-document-extraction-templates-catalog.js";
import { replaceCustomViewsCatalog } from "../../custom-views/replace-custom-views-catalog.js";
import { createHookRuntimeContext } from "../../hooks/hook-runtime-context.js";
import { replaceDataHooksCatalog } from "../../hooks/replace-data-hooks-catalog.js";
import { parseFormulaDefinitionsCatalogJson } from "@repo/formula-definitions";
import { parseLocalePacksCatalogJson } from "@repo/locale-packs";
import { createFormulaRuntimeContext } from "../../formulas/formula-runtime-context.js";
import { replaceFormulasCatalog } from "../../formulas/replace-formulas-catalog.js";
import { createLocalePackRuntimeContext } from "../../locale-packs/locale-pack-runtime-context.js";
import { replaceLocalePacksCatalog } from "../../locale-packs/replace-locale-packs-catalog.js";
import {
  loadChartDefinitionsCatalogJson,
  loadCustomViewsCatalogJson,
  loadDataHooksCatalogJson,
  loadDocumentExtractionTemplatesCatalogJson,
  loadEntityDefinitionsCatalogJson,
  loadFormulaDefinitionsCatalogJson,
  loadInsightSurfacesCatalogJson,
  loadLocalePacksCatalogJson,
  loadMetricDefinitionsCatalogJson,
  loadQueryDefinitionsCatalogJson,
} from "./seed-catalog-dir.js";

interface SeedLocalCatalogsResult {
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
  readonly insightSurfaceCounts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly documentExtractionTemplateCounts: {
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
  readonly localePackCounts: {
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

interface SeedLocalCatalogsOptions {
  readonly entities?: boolean;
  readonly metrics?: boolean;
  readonly queries?: boolean;
  readonly hooks?: boolean;
  readonly formulas?: boolean;
  readonly charts?: boolean;
  readonly insightSurfaces?: boolean;
  readonly documentExtractionTemplates?: boolean;
  readonly customViews?: boolean;
  readonly localePacks?: boolean;
}

export async function seedLocalCatalogs(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  options: SeedLocalCatalogsOptions = {},
): Promise<SeedLocalCatalogsResult> {
  const includeEntities = options.entities ?? true;
  const includeMetrics = options.metrics ?? true;
  const includeQueries = options.queries ?? true;
  const includeHooks = options.hooks ?? true;
  const includeFormulas = options.formulas ?? true;
  const includeCharts = options.charts ?? true;
  const includeInsightSurfaces = options.insightSurfaces ?? true;
  const includeDocumentExtractionTemplates =
    options.documentExtractionTemplates ?? true;
  const includeCustomViews = options.customViews ?? true;
  const includeLocalePacks = options.localePacks ?? true;

  const entityCategoryRepository =
    createFirestoreAdminEntityCategoryRepository(firebaseAdminConfig);
  const metricDefinitionRepository =
    createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig);
  const entityQueryDefinitionRepository =
    createFirestoreAdminEntityQueryDefinitionRepository(firebaseAdminConfig);
  const chartDefinitionRepository =
    createFirestoreAdminChartDefinitionRepository(firebaseAdminConfig);
  const insightSurfaceRepository =
    createFirestoreAdminInsightSurfaceRepository(firebaseAdminConfig);
  const documentExtractionTemplateRepository =
    createFirestoreAdminDocumentExtractionTemplateRepository(
      firebaseAdminConfig,
    );
  const customViewRepository =
    createFirestoreAdminCustomViewRepository(firebaseAdminConfig);
  const dataHookRepository =
    createFirestoreAdminDataHookRepository(firebaseAdminConfig);
  const formulaDefinitionRepository =
    createFirestoreAdminFormulaDefinitionRepository(firebaseAdminConfig);
  const localePackRepository =
    createFirestoreAdminLocalePackRepository(firebaseAdminConfig);
  const entityUiOverrideRepository =
    createFirestoreAdminEntityUiOverrideRepository(firebaseAdminConfig);
  const tenantSidebarLayoutRepository =
    createFirestoreAdminTenantSidebarLayoutRepository(firebaseAdminConfig);
  const tenantDashboardLayoutRepository =
    createFirestoreAdminTenantDashboardLayoutRepository(firebaseAdminConfig);
  const tenantRepository =
    createFirestoreAdminTenantRepository(firebaseAdminConfig);
  const hookRuntime = createHookRuntimeContext(dataHookRepository);
  const formulaRuntime = createFormulaRuntimeContext(
    formulaDefinitionRepository,
  );
  const localePackRuntime = createLocalePackRuntimeContext({
    repository: localePackRepository,
    tenantRepository,
    harvestRepositories: {
      entityDefinition: entityRuntime.entityDefinitionRepository,
      entityCategory: entityCategoryRepository,
      metricDefinition: metricDefinitionRepository,
      chartDefinition: chartDefinitionRepository,
      customView: customViewRepository,
      entityQueryDefinition: entityQueryDefinitionRepository,
      entityUiOverride: entityUiOverrideRepository,
      tenantSidebarLayout: tenantSidebarLayoutRepository,
      tenantDashboardLayout: tenantDashboardLayoutRepository,
    },
  });

  let entityCounts = { ...EMPTY_CATALOG_COUNTS };
  let definitionRecords: SeedLocalCatalogsResult["definitionRecords"] = [];

  if (includeEntities) {
    const entityParsed = parseEntityDefinitionsCatalogJson(
      loadEntityDefinitionsCatalogJson(),
    );
    if (!entityParsed.ok) {
      throw new Error(
        `Invalid local tenant entity catalog: ${entityParsed.errors.map((error) => error.message).join("; ")}`,
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
    definitionRecords =
      await entityRuntime.entityDefinitionRepository.list(tenantId);
  }

  let queryCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeQueries) {
    const queryParsed = parseEntityQueryDefinitionsCatalogJson(
      loadQueryDefinitionsCatalogJson(),
    );
    if (!queryParsed.ok) {
      throw new Error(
        `Invalid local tenant query catalog: ${queryParsed.errors.map((error) => error.message).join("; ")}`,
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
        `Invalid local tenant metric catalog: ${metricParsed.errors.map((error) => error.message).join("; ")}`,
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
        `Invalid local tenant chart catalog: ${chartParsed.errors.map((error) => error.message).join("; ")}`,
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

  let insightSurfaceCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeInsightSurfaces) {
    const insightSurfaceParsed = parseInsightSurfacesCatalogJson(
      loadInsightSurfacesCatalogJson(),
    );
    if (!insightSurfaceParsed.ok) {
      throw new Error(
        `Invalid local tenant insight surfaces catalog: ${insightSurfaceParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
    const insightSurfaceResult = await replaceInsightSurfacesCatalog(
      {
        insightSurfaceRepository,
      },
      tenantId,
      insightSurfaceParsed.data,
    );
    insightSurfaceCounts = insightSurfaceResult.counts;
  }

  let documentExtractionTemplateCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeDocumentExtractionTemplates) {
    const documentExtractionTemplateParsed =
      parseDocumentExtractionTemplatesCatalogJson(
        loadDocumentExtractionTemplatesCatalogJson(),
      );
    if (!documentExtractionTemplateParsed.ok) {
      throw new Error(
        `Invalid local tenant document extraction templates catalog: ${documentExtractionTemplateParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
    const documentExtractionTemplateResult =
      await replaceDocumentExtractionTemplatesCatalog(
        {
          documentExtractionTemplateRepository,
        },
        tenantId,
        documentExtractionTemplateParsed.data,
      );
    documentExtractionTemplateCounts = documentExtractionTemplateResult.counts;
  }

  let formulaCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeFormulas) {
    const formulasParsed = parseFormulaDefinitionsCatalogJson(
      loadFormulaDefinitionsCatalogJson(),
    );
    if (!formulasParsed.ok) {
      throw new Error(
        `Invalid local tenant formula catalog: ${formulasParsed.errors.map((error) => error.message).join("; ")}`,
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
        `Invalid local tenant data hooks catalog: ${dataHooksParsed.errors.map((error) => error.message).join("; ")}`,
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
        `Invalid local tenant custom views catalog: ${customViewParsed.errors.map((error) => error.message).join("; ")}`,
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

  let localePackCounts = { ...EMPTY_CATALOG_COUNTS };
  if (includeLocalePacks) {
    const localePacksParsed = parseLocalePacksCatalogJson(
      loadLocalePacksCatalogJson(),
    );
    if (!localePacksParsed.ok) {
      throw new Error(
        `Invalid local tenant locale packs catalog: ${localePacksParsed.errors.map((error) => error.message).join("; ")}`,
      );
    }
    const localePackResult = await replaceLocalePacksCatalog(
      localePackRuntime,
      tenantId,
      localePacksParsed.data,
    );
    localePackCounts = localePackResult.counts;
  }

  console.log(
    `[local-tenant seed] Catalogs: entities +${entityCounts.created}/~${entityCounts.updated}/-${entityCounts.deleted}, metrics +${metricCounts.created}/~${metricCounts.updated}/-${metricCounts.deleted}, queries +${queryCounts.created}/~${queryCounts.updated}/-${queryCounts.deleted}, charts +${chartCounts.created}/~${chartCounts.updated}/-${chartCounts.deleted}, insightSurfaces +${insightSurfaceCounts.created}/~${insightSurfaceCounts.updated}/-${insightSurfaceCounts.deleted}, documentExtractionTemplates +${documentExtractionTemplateCounts.created}/~${documentExtractionTemplateCounts.updated}/-${documentExtractionTemplateCounts.deleted}, formulas +${formulaCounts.created}/~${formulaCounts.updated}/-${formulaCounts.deleted}, hooks +${hookCounts.created}/~${hookCounts.updated}/-${hookCounts.deleted}, customViews +${customViewCounts.created}/~${customViewCounts.updated}/-${customViewCounts.deleted}, localePacks +${localePackCounts.created}/~${localePackCounts.updated}/-${localePackCounts.deleted}`,
  );

  return {
    entityCounts,
    metricCounts,
    queryCounts,
    chartCounts,
    insightSurfaceCounts,
    documentExtractionTemplateCounts,
    formulaCounts,
    hookCounts,
    customViewCounts,
    localePackCounts,
    definitionRecords,
  };
}
