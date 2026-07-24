import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  defineEntityFromRecord,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import { parseEntityQueryDefinitionJson } from "@repo/entity-queries";
import {
  dashboardSectionsSchema,
  validatePutEntityUiOverrideInput,
  type DashboardSectionDefinition,
  type PutEntityUiOverrideInput,
  type PutTenantDashboardLayoutInput,
} from "@repo/entities";
import {
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminEntityUiOverrideRepository,
  createFirestoreAdminTenantDashboardLayoutRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import {
  uiLayoutDocumentSchema,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

import { resolveTenantImportDir } from "../../scripts/resolve-tenant-import-dir.js";
import { parseLocalEntityUiOverridesCatalog } from "./seed-entity-ui-overrides.js";
import { parseLocalTenantDashboardLayoutCatalog } from "./seed-tenant-dashboard-layout.js";

function resolveLocalTenantImportDir(): string {
  return resolveTenantImportDir();
}

const LOCAL_UI_DIR = join(resolveLocalTenantImportDir(), "ui");
const LOCAL_UI_QUERY_DIR = "query-definitions";
const LOCAL_UI_OVERRIDE_DIR = "entity-ui-overrides";
const LOCAL_UI_DASHBOARD_SLICE = "tenant-dashboard-layout-slice.json";

const tenantDashboardLayoutSliceSchema = z
  .object({
    kind: z.literal("tenant-dashboard-layout-catalog"),
    version: z.literal(1),
    description: z.string().optional(),
    dashboardSections: dashboardSectionsSchema,
    shellAppendRows: z.array(z.unknown()).optional(),
    shellRemoveRowIds: z.array(z.string()).optional(),
  })
  .strict();

function listJsonFiles(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }
  return readdirSync(dirPath)
    .filter(
      (name) =>
        name.endsWith(".json") &&
        !name.startsWith("_") &&
        !name.startsWith("."),
    )
    .sort((a, b) => a.localeCompare(b));
}

function readLocalUiJson(fileName: string): string | null {
  const filePath = join(LOCAL_UI_DIR, fileName);
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, "utf8");
}

function mergeDashboardSections(
  existing: readonly DashboardSectionDefinition[],
  incoming: readonly DashboardSectionDefinition[],
): DashboardSectionDefinition[] {
  const byId = new Map(existing.map((section) => [section.id, section]));
  for (const section of incoming) {
    byId.set(section.id, section);
  }
  return [...byId.values()];
}

function applyShellRowSlice(
  dashboardLayout: UiLayoutDocument,
  rowsToAppend: readonly RowNode[],
  removeRowIds: readonly string[] = [],
): UiLayoutDocument {
  const root = dashboardLayout.root;
  if (root.type !== "screen-root") {
    return dashboardLayout;
  }

  const removeIds = new Set(removeRowIds);
  const appendById = new Map(rowsToAppend.map((row) => [row.id, row]));
  const existingRows = (root.rows as RowNode[]).filter(
    (row) => !removeIds.has(row.id),
  );
  const nextRows = existingRows.map(
    (row) => appendById.get(row.id) ?? row,
  ) as RowNode[];

  for (const row of rowsToAppend) {
    if (!existingRows.some((existing) => existing.id === row.id)) {
      nextRows.push(row);
    }
  }

  return {
    ...dashboardLayout,
    root: {
      ...root,
      rows: nextRows,
    },
  };
}

async function seedLocalQueryDefinitionsSlice(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<number> {
  const queryDir = join(LOCAL_UI_DIR, LOCAL_UI_QUERY_DIR);
  const files = listJsonFiles(queryDir);
  if (files.length === 0) {
    return 0;
  }

  const definitions = files.map((fileName) => {
    const filePath = join(queryDir, fileName);
    const parsed = parseEntityQueryDefinitionJson(
      readFileSync(filePath, "utf8"),
    );
    if (!parsed.ok) {
      throw new Error(
        `[seed] Invalid ${filePath}: ${parsed.errors[0]?.message ?? "unknown error"}`,
      );
    }
    return parsed.data;
  });

  const repository =
    createFirestoreAdminEntityQueryDefinitionRepository(firebaseAdminConfig);
  const existing = await repository.list(tenantId);
  let seeded = 0;

  for (const imported of definitions) {
    const match = existing.find(
      (item) =>
        item.name.trim().toLowerCase() === imported.name.trim().toLowerCase(),
    );

    if (match) {
      await repository.update(tenantId, match.id, {
        name: imported.name,
        queryMode: imported.queryMode,
        filter: imported.filter,
        sort: imported.sort,
        limitMode: imported.limitMode,
        ...(imported.limitMode === "topN" ? { limit: imported.limit } : {}),
        status: imported.status,
        ...(imported.parameters ? { parameters: imported.parameters } : {}),
        ...(imported.groupBy !== undefined
          ? { groupBy: imported.groupBy }
          : {}),
        ...(imported.aggregations !== undefined
          ? { aggregations: imported.aggregations }
          : {}),
        ...(imported.groupSort !== undefined
          ? { groupSort: imported.groupSort }
          : {}),
        ...(imported.groupLimit !== undefined
          ? { groupLimit: imported.groupLimit }
          : {}),
      });
    } else {
      await repository.create(tenantId, imported);
    }

    seeded += 1;
    console.log(`[seed]   local query: ${imported.name}`);
  }

  return seeded;
}

async function seedLocalEntityUiOverrideSlice(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
): Promise<number> {
  const overrideDir = join(LOCAL_UI_DIR, LOCAL_UI_OVERRIDE_DIR);
  const files = listJsonFiles(overrideDir);
  if (files.length === 0) {
    return 0;
  }

  const overrides = files.map((fileName) => {
    const filePath = join(overrideDir, fileName);
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as { data?: unknown }).data === undefined
    ) {
      throw new Error(`[seed] Invalid UI override envelope: ${filePath}`);
    }
    return (parsed as { data: unknown }).data;
  });

  const catalog = parseLocalEntityUiOverridesCatalog(
    JSON.stringify({
      kind: "entity-ui-overrides-catalog",
      version: 1,
      overrides,
    }),
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
        `[seed] Skipping local UI override for unknown entity "${override.entityName}".`,
      );
      continue;
    }

    const entity = defineEntityFromRecord(definition);
    const existingOverride = await repository.get(
      tenantId,
      override.entityName,
    );
    const existingWidgets = existingOverride?.metricWidgets ?? [];
    const incomingWidgets = override.metricWidgets ?? [];
    const mergedWidgets = [
      ...existingWidgets.filter(
        (widget) =>
          !incomingWidgets.some((incoming) => incoming.id === widget.id),
      ),
      ...incomingWidgets,
    ];

    const resolvedInput = {
      views: override.views,
      ...(override.listViewType ? { listViewType: override.listViewType } : {}),
      ...(override.listItem ? { listItem: override.listItem } : {}),
      ...(override.recordDetail ? { recordDetail: override.recordDetail } : {}),
      ...(override.metricRowLayout
        ? { metricRowLayout: override.metricRowLayout }
        : {}),
      metricWidgets: mergedWidgets,
    } as PutEntityUiOverrideInput;

    const validation = validatePutEntityUiOverrideInput(
      entity,
      resolvedInput,
      definition.ui,
    );
    if (!validation.ok) {
      const detail = validation.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join("; ");
      throw new Error(
        `Invalid local UI override for "${override.entityName}": ${detail}`,
      );
    }

    await repository.put(tenantId, override.entityName, resolvedInput);
    seeded += 1;
    console.log(
      `[seed]   local UI override: ${override.entityName} (${incomingWidgets.length} widget(s))`,
    );
  }

  return seeded;
}

async function seedLocalDashboardLayoutSlice(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<boolean> {
  const jsonText = readLocalUiJson(LOCAL_UI_DASHBOARD_SLICE);
  if (!jsonText) {
    return false;
  }

  const slice = tenantDashboardLayoutSliceSchema.parse(JSON.parse(jsonText));
  const dashboardRepository =
    createFirestoreAdminTenantDashboardLayoutRepository(firebaseAdminConfig);
  const existing = await dashboardRepository.get(tenantId);
  const baseLayout = existing
    ? {
        dashboardLayout: existing.dashboardLayout,
        dashboardSections: existing.dashboardSections,
      }
    : parseLocalTenantDashboardLayoutCatalog(
        readFileSync(
          join(
            dirname(fileURLToPath(import.meta.url)),
            "catalogs",
            "tenant-dashboard-layout.json",
          ),
          "utf8",
        ),
      );

  const shellAppendRows = (slice.shellAppendRows ?? []).map((row) =>
    z
      .object({
        type: z.literal("component"),
        id: z.string(),
      })
      .passthrough()
      .parse(row),
  ) as unknown as RowNode[];

  const nextInput = {
    dashboardSections: mergeDashboardSections(
      baseLayout.dashboardSections as DashboardSectionDefinition[],
      slice.dashboardSections as DashboardSectionDefinition[],
    ),
    dashboardLayout: applyShellRowSlice(
      baseLayout.dashboardLayout as UiLayoutDocument,
      shellAppendRows,
      slice.shellRemoveRowIds ?? [],
    ),
  } as PutTenantDashboardLayoutInput;

  uiLayoutDocumentSchema.parse(nextInput.dashboardLayout);
  dashboardSectionsSchema.parse(nextInput.dashboardSections);

  await dashboardRepository.put(tenantId, nextInput);
  console.log(
    `[seed]   local dashboard layout: ${slice.dashboardSections.length} section slice(s)`,
  );
  return true;
}

export function hasLocalTenantUiSlices(uiDir: string = LOCAL_UI_DIR): boolean {
  return (
    listJsonFiles(join(uiDir, LOCAL_UI_QUERY_DIR)).length > 0 ||
    listJsonFiles(join(uiDir, LOCAL_UI_OVERRIDE_DIR)).length > 0 ||
    existsSync(join(uiDir, LOCAL_UI_DASHBOARD_SLICE))
  );
}

export async function seedLocalTenantUiSlicesIfPresent(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  uiDir: string = LOCAL_UI_DIR,
): Promise<{
  readonly queriesSeeded: number;
  readonly overridesSeeded: number;
  readonly dashboardSeeded: boolean;
}> {
  if (!hasLocalTenantUiSlices(uiDir)) {
    return {
      queriesSeeded: 0,
      overridesSeeded: 0,
      dashboardSeeded: false,
    };
  }

  console.log(`[seed] Applying local tenant UI slices from ${uiDir}...`);

  const queriesSeeded = await seedLocalQueryDefinitionsSlice(
    tenantId,
    firebaseAdminConfig,
  );
  const overridesSeeded = await seedLocalEntityUiOverrideSlice(
    tenantId,
    firebaseAdminConfig,
    definitionRecords,
  );
  const dashboardSeeded = await seedLocalDashboardLayoutSlice(
    tenantId,
    firebaseAdminConfig,
  );

  console.log("[seed] Local tenant UI slices applied.");
  return { queriesSeeded, overridesSeeded, dashboardSeeded };
}
