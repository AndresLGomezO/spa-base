import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { MetricWidgetDefinition } from "@repo/entities";
import {
  LAYOUT_STATIC_IMAGE_FIELD_NAME,
  serializeLayoutStaticImageRef,
} from "@repo/entities";
import {
  createEntityFileDownloadUrl,
  uploadEntityFile,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { resolveTenantImportDir } from "../../scripts/resolve-tenant-import-dir.js";

export const TOTAL_BALANCE_CHART_ROW_ID = "row-total-balance-chart";
export const INCOME_CHART_ROW_ID = "row-income-chart";
const EXPENSES_CHART_ROW_ID = "row-expenses-chart";
const INVEST_CHART_ROW_ID = "row-invest-chart";

const LOCAL_ASSETS_DIR = join(resolveTenantImportDir(), "assets");

const METRIC_WIDGET_CHART_SPECS = [
  {
    rowId: TOTAL_BALANCE_CHART_ROW_ID,
    localFileName: "total-balance-chart.png",
    fallbackSrc: "/images/total-balance-area-chart.svg",
  },
  {
    rowId: INCOME_CHART_ROW_ID,
    localFileName: "income-metric-chart.png",
    fallbackSrc: "/images/income-metric-chart.svg",
  },
  {
    rowId: EXPENSES_CHART_ROW_ID,
    localFileName: "expenses-metric-chart.png",
    fallbackSrc: "/images/expenses-metric-chart.svg",
  },
  {
    rowId: INVEST_CHART_ROW_ID,
    localFileName: "invest-metric-chart.png",
    fallbackSrc: "/images/invest-metric-chart.svg",
  },
] as const;

const SEED_UPLOADED_BY = "seed-database";

type ChartSpec = (typeof METRIC_WIDGET_CHART_SPECS)[number];

async function resolveChartStaticValue(
  spec: ChartSpec,
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<string> {
  const localPath = join(LOCAL_ASSETS_DIR, spec.localFileName);
  if (!existsSync(localPath)) {
    console.log(
      `[seed] No local chart at ${localPath}; using bundled fallback ${spec.fallbackSrc}.`,
    );
    return spec.fallbackSrc;
  }

  const buffer = readFileSync(localPath);
  const objectId = randomUUID();

  const file = await uploadEntityFile({
    config: firebaseAdminConfig,
    tenantId,
    entityName: "account",
    fieldName: LAYOUT_STATIC_IMAGE_FIELD_NAME,
    fieldType: "image",
    objectId,
    buffer,
    contentType: "image/png",
    fileName: spec.localFileName,
    uploadedBy: SEED_UPLOADED_BY,
  });

  const downloadUrl = await createEntityFileDownloadUrl({
    config: firebaseAdminConfig,
    storagePath: file.storagePath,
  });

  return serializeLayoutStaticImageRef({ ...file, downloadUrl });
}

export async function resolveMetricWidgetChartRefs(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<ReadonlyMap<string, string>> {
  const refs = new Map<string, string>();
  for (const spec of METRIC_WIDGET_CHART_SPECS) {
    refs.set(
      spec.rowId,
      await resolveChartStaticValue(spec, tenantId, firebaseAdminConfig),
    );
  }
  return refs;
}

type MutableRecord = Record<string, unknown>;

function isRowNode(value: unknown): value is MutableRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as MutableRecord).type === "component"
  );
}

function patchChartRowImageValue(
  node: unknown,
  rowId: string,
  chartValue: string,
): boolean {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some((entry) =>
      patchChartRowImageValue(entry, rowId, chartValue),
    );
  }

  const record = node as MutableRecord;

  if (
    isRowNode(record) &&
    record.id === rowId &&
    record.component &&
    typeof record.component === "object"
  ) {
    const component = record.component as MutableRecord;
    if (component.kind === "image") {
      component.primary = { type: "static", value: chartValue };
      return true;
    }
  }

  for (const value of Object.values(record)) {
    if (patchChartRowImageValue(value, rowId, chartValue)) {
      return true;
    }
  }

  return false;
}

export function injectMetricWidgetChartRefs(
  metricWidgets: readonly MetricWidgetDefinition[] | undefined,
  chartRefsByRowId: ReadonlyMap<string, string>,
): readonly MetricWidgetDefinition[] | undefined {
  if (!metricWidgets) {
    return metricWidgets;
  }

  return metricWidgets.map((widget) => {
    const layout = structuredClone(widget.layout) as unknown as MutableRecord;

    for (const [rowId, chartValue] of chartRefsByRowId) {
      const patched = patchChartRowImageValue(layout, rowId, chartValue);
      if (!patched) {
        continue;
      }
    }

    return {
      ...widget,
      layout: layout as unknown as MetricWidgetDefinition["layout"],
    };
  });
}
