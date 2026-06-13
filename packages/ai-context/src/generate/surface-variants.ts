import {
  componentKindsForSurface,
  createDefaultListCardLayout,
  type DesignSurface,
} from "@repo/ui-builder-core";
import type { DesignLayoutSurface } from "@repo/entities";
import {
  createDefaultUiLayout,
  createDesignLayoutSliceEnvelope,
  createDesignLayoutSliceSkeleton,
} from "@repo/entities";

import {
  buildComponentAtomMarkdown,
  componentAtomId,
} from "./component-descriptions.js";

export interface SurfaceVariantSpec {
  readonly fragmentId: string;
  readonly title: string;
  readonly designSurface: DesignSurface;
  readonly designLayoutSurface?: DesignLayoutSurface;
  readonly description: string;
  readonly extraNotes?: string;
  readonly buildSkeleton?: () => string;
}

export const SURFACE_VARIANTS: readonly SurfaceVariantSpec[] = [
  {
    fragmentId: "ui.surface.list.table",
    title: "Item list — table",
    designSurface: "tableColumnCell",
    designLayoutSurface: "list",
    description:
      "Flat column table. Field paths in `views[].fields` (not layout tree).",
    extraNotes:
      'Set `listViewType: "table"`. Columns are field path strings. Optional `showActions`.',
  },
  {
    fragmentId: "ui.surface.list.card",
    title: "Item list — card",
    designSurface: "listItem",
    designLayoutSurface: "list",
    description: "Card grid using `listItem` UiLayoutDocument per record.",
    extraNotes:
      'Set `listViewType: "card"`. Layout uses display components only. Prefer root → single nested-layout row → inner columns (see `ui.layout.base` card pattern).',
    buildSkeleton: () =>
      stabilizeLayoutJson(
        JSON.stringify(
          createDesignLayoutSliceEnvelope("list", {
            listViewType: "card",
            table: { fields: ["name", "status", "amount"], showActions: true },
            listItem: createDefaultListCardLayout(["name", "status", "amount"]),
            expandableTable: {
              columns: [
                {
                  id: "col-1",
                  label: "Column",
                  cellLayout: createDefaultUiLayout(["name"]),
                },
              ],
              rowExpandLayout: createDefaultUiLayout(["name"]),
              showActions: true,
            },
          }),
          null,
          2,
        ),
      ),
  },
  {
    fragmentId: "ui.surface.list.expandableTable",
    title: "Item list — expandable table",
    designSurface: "tableColumnCell",
    designLayoutSurface: "list",
    description:
      "Grouped columns with per-column `cellLayout` and `rowExpandLayout`.",
    extraNotes:
      'Set `listViewType: "expandableTable"`. Each column has `cellLayout: UiLayoutDocument`. Columns support `displayFrom`/`displayTo` for responsive column visibility. `rowExpandLayout` uses nested single-column pattern for expanded row content.',
  },
  {
    fragmentId: "ui.surface.forms.plain",
    title: "Forms — plain",
    designSurface: "formPlain",
    designLayoutSurface: "forms",
    description: "Single-page create/edit form layout.",
    extraNotes:
      'Set `presentation: "plain"`. Use form-field, form-section, form-actions.',
  },
  {
    fragmentId: "ui.surface.forms.wizard",
    title: "Forms — wizard",
    designSurface: "formWizardShell",
    designLayoutSurface: "forms",
    description: "Multi-step wizard with shell + step layouts.",
    extraNotes:
      'Set `presentation: "wizard"`. Shell: wizard-progress, wizard-step-host, wizard-actions. Steps: form-field, form-section.',
  },
  {
    fragmentId: "ui.surface.mainPage",
    title: "Main view",
    designSurface: "mainPage",
    designLayoutSurface: "mainPage",
    description: "Entity main page slots: header, toolbar, metrics, list.",
    extraNotes:
      "Stored as `mainPage` on entity UI override. Slot kinds: page-header, page-toolbar, page-metrics, page-list.",
  },
  {
    fragmentId: "ui.surface.recordDetail",
    title: "Detail view",
    designSurface: "recordDetail",
    designLayoutSurface: "recordDetail",
    description: "Record detail page layout.",
    extraNotes:
      "Display components + related-records. Stored as `recordDetail`.",
  },
  {
    fragmentId: "ui.surface.metricsRow",
    title: "Metrics row",
    designSurface: "metricRow",
    designLayoutSurface: "metricsRowDesigner",
    description: "Metric widgets row above entity list.",
    extraNotes:
      "Requires `metricWidgets[]` definitions and `metricRowLayout` with metric-widget refs.",
  },
];

/** Replace random layout ids so generated fragments are deterministic in CI. */
function stabilizeLayoutJson(json: string): string {
  return json.replace(/"(row|col|root|nested)-[a-f0-9-]+"/g, '"$1-example"');
}

export function buildSurfaceVariantMarkdown(spec: SurfaceVariantSpec): string {
  const allowedKinds = componentKindsForSurface(spec.designSurface);
  const skeleton = spec.buildSkeleton
    ? spec.buildSkeleton()
    : spec.designLayoutSurface
      ? stabilizeLayoutJson(
          createDesignLayoutSliceSkeleton(spec.designLayoutSurface),
        )
      : "{}";

  const kindList = allowedKinds.map((k) => `- \`${k}\``).join("\n");

  return `# ${spec.title}

${spec.description}

${spec.extraNotes ?? ""}

## Allowed component kinds
${kindList}

## Slice envelope example
\`\`\`json
${skeleton}
\`\`\`
`;
}

export function buildAllGeneratedFragments(): Record<string, string> {
  const fragments: Record<string, string> = {};

  for (const spec of SURFACE_VARIANTS) {
    fragments[spec.fragmentId] = buildSurfaceVariantMarkdown(spec);
  }

  const allKinds = new Set<string>();
  for (const spec of SURFACE_VARIANTS) {
    for (const kind of componentKindsForSurface(spec.designSurface)) {
      allKinds.add(kind);
    }
  }

  for (const kind of allKinds) {
    fragments[componentAtomId(kind as Parameters<typeof componentAtomId>[0])] =
      buildComponentAtomMarkdown(
        kind as Parameters<typeof buildComponentAtomMarkdown>[0],
      );
  }

  return fragments;
}
