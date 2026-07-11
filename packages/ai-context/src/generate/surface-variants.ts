import {
  componentKindsForSurface,
  createDefaultListCardLayout,
  createDefaultWizardFormConfig,
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
    fragmentId: "ui.surface.list.card",
    title: "Item list — card",
    designSurface: "listItem",
    designLayoutSurface: "list",
    description: "Card grid using `listItem` UiLayoutDocument per record.",
    extraNotes:
      'Set `listViewType: "card"`. Default preset: `card-list`. Layout uses display components only. Prefer root → container → grid with two tracks (see `ui.layout.base` card pattern).',
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
      'Set `listViewType: "expandableTable"`. Default preset: `expandable-table-list`. Each column has `cellLayout: UiLayoutDocument`. Optional `imageFieldPath` for a dedicated logo/photo column. Columns support `displayFrom`/`displayTo` for responsive column visibility. `rowExpandLayout` uses a 3-column grid for expanded row content. `table.fields` carries toolbar/filter field metadata.',
    buildSkeleton: () =>
      stabilizeLayoutJson(
        JSON.stringify(
          createDesignLayoutSliceEnvelope("list", {
            listViewType: "expandableTable",
            table: { fields: ["name", "status", "amount"], showActions: true },
            expandableTable: {
              columns: [
                {
                  id: "col-1",
                  label: "Name",
                  cellLayout: createDefaultUiLayout(["name"]),
                },
                {
                  id: "col-2",
                  label: "Status",
                  cellLayout: createDefaultUiLayout(["status"]),
                },
                {
                  id: "col-3",
                  label: "Amount",
                  cellLayout: createDefaultUiLayout(["amount"]),
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
    fragmentId: "ui.surface.forms.plain",
    title: "Forms — plain",
    designSurface: "formPlain",
    designLayoutSurface: "forms",
    description: "Single-page create/edit form layout.",
    extraNotes:
      'Set `presentation: "plain"`. Default preset: `plain-form`. Use form-field, form-section, form-actions.',
  },
  {
    fragmentId: "ui.surface.forms.wizard",
    title: "Forms — wizard",
    designSurface: "formWizardShell",
    designLayoutSurface: "forms",
    description: "Multi-step wizard with shell + step layouts.",
    extraNotes:
      'Set `presentation: "wizard"`. Default preset: `wizard-form`. Shell: wizard-progress, wizard-step-host, wizard-actions. Steps: form-field, form-section.',
    buildSkeleton: () => {
      const wizard = createDefaultWizardFormConfig(["name"]);
      return stabilizeLayoutJson(
        JSON.stringify(
          createDesignLayoutSliceEnvelope("forms", {
            presentation: "wizard",
            modalSize: "md",
            wizard: {
              shellLayout: wizard.shellLayout,
              steps: wizard.steps.map((step) => ({
                ...step,
                id: "step-example",
              })),
            },
          }),
          null,
          2,
        ),
      );
    },
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
  {
    fragmentId: "ui.surface.sidebarLayout",
    title: "App shell — Sidebar",
    designSurface: "sidebarLayout",
    description:
      "Tenant app sidebar chrome: logo, collapse control, nav item templates, notifications, and profile.",
    extraNotes:
      "Part of App shell (Design Layout → App shell → Sidebar tab). Persisted on tenant_sidebar_layouts.sidebarLayout. No tenant doc → hardcoded AppSidebar. System Configuration and tenant switcher are injected at runtime for admins.",
    buildSkeleton: () =>
      JSON.stringify(
        {
          kind: "sidebar-nav",
          groupItem: { rows: [] },
          subgroupItem: { rows: [] },
          rawItem: { rows: [] },
        },
        null,
        2,
      ),
  },
  {
    fragmentId: "ui.surface.headerLayout",
    title: "App shell — Header",
    designSurface: "headerLayout",
    description:
      "Global app header (mobile hamburger bar). Independent of the sidebar layout.",
    extraNotes:
      "Part of App shell → Header tab. Use sidebar-trigger for the menu button. Visibility via hamburgerBreakpoint settings and displayFrom/displayTo.",
    buildSkeleton: () =>
      JSON.stringify({ kind: "sidebar-trigger", iconName: "Menu" }, null, 2),
  },
  {
    fragmentId: "ui.surface.footerLayout",
    title: "App shell — Footer",
    designSurface: "footerLayout",
    description:
      "Global bottom navigation tabs. Independent of the sidebar layout.",
    extraNotes:
      "Part of App shell → Footer tab. Use nav-tab components for icon+label route links. Empty footer → not rendered at runtime.",
    buildSkeleton: () =>
      JSON.stringify(
        {
          kind: "nav-tab",
          iconName: "Home",
          label: "Home",
          to: "/",
        },
        null,
        2,
      ),
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
