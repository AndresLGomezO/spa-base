import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  AreaChart,
  Badge,
  Box,
  Calendar,
  ChartLine,
  Columns2,
  Filter,
  Hash,
  Image,
  Layers,
  LayoutGrid,
  ListChecks,
  MousePointerClick,
  PanelLeftClose,
  PanelLeft,
  PanelTop,
  Menu,
  Route,
  Search,
  Sparkles,
  TextCursorInput,
  Type,
  UserRound,
  Bell,
  LayoutPanelTop,
} from "lucide-react";
import {
  isComponentKindAllowedOnSurface,
  type ChartType,
  type DesignSurface,
  type UiComponentKind,
} from "@repo/ui-builder-core";

export type CatalogEntryKind = UiComponentKind;

export type CatalogSectionId =
  | "layout"
  | "content"
  | "charts"
  | "form"
  | "dataControls";

export interface ComponentCatalogEntry {
  readonly kind: CatalogEntryKind;
  readonly icon: LucideIcon;
  readonly entryId?: string;
  readonly defaultChartType?: ChartType;
}

interface ComponentCatalogSection {
  readonly id: CatalogSectionId;
  readonly entries: readonly ComponentCatalogEntry[];
}

const LAYOUT_SECTION: ComponentCatalogSection = {
  id: "layout",
  entries: [
    { kind: "container", icon: Box },
    { kind: "grid", icon: LayoutGrid },
    { kind: "wizard-progress", icon: Route },
    { kind: "wizard-step-host", icon: Layers },
  ],
};

const CONTENT_SECTION: ComponentCatalogSection = {
  id: "content",
  entries: [
    { kind: "text", icon: Type },
    { kind: "image", icon: Image },
    { kind: "icon", icon: Sparkles },
    { kind: "date", icon: Calendar },
    { kind: "numeric", icon: Hash },
    { kind: "badge", icon: Badge },
  ],
};

const CHARTS_SECTION: ComponentCatalogSection = {
  id: "charts",
  entries: [
    {
      kind: "chart",
      entryId: "chart-line",
      icon: ChartLine,
      defaultChartType: "line",
    },
    {
      kind: "chart",
      entryId: "chart-area",
      icon: AreaChart,
      defaultChartType: "area",
    },
  ],
};

const FORM_SECTION: ComponentCatalogSection = {
  id: "form",
  entries: [
    { kind: "form-field", icon: TextCursorInput },
    { kind: "entity-field-selector", icon: ListChecks },
    { kind: "form-section", icon: PanelTop },
    { kind: "form-actions", icon: MousePointerClick },
    { kind: "wizard-actions", icon: ArrowRightLeft },
  ],
};

const DATA_CONTROLS_SECTION: ComponentCatalogSection = {
  id: "dataControls",
  entries: [
    { kind: "view-search", icon: Search },
    { kind: "view-filters", icon: Filter },
    { kind: "view-date-filter", icon: Calendar },
  ],
};

const ALL_SECTIONS: readonly ComponentCatalogSection[] = [
  LAYOUT_SECTION,
  CONTENT_SECTION,
  CHARTS_SECTION,
  FORM_SECTION,
  DATA_CONTROLS_SECTION,
];

function isAllowedOnSurface(
  kind: CatalogEntryKind,
  designSurface: DesignSurface,
): boolean {
  return isComponentKindAllowedOnSurface(kind, designSurface);
}

function filterSectionEntries(
  section: ComponentCatalogSection,
  designSurface: DesignSurface,
): ComponentCatalogSection {
  return {
    ...section,
    entries: section.entries.filter((entry) =>
      isAllowedOnSurface(entry.kind, designSurface),
    ),
  };
}

export function getFilteredComponentCatalog(
  designSurface: DesignSurface,
): readonly ComponentCatalogSection[] {
  const sections = ALL_SECTIONS.map((section) =>
    filterSectionEntries(section, designSurface),
  ).filter((section) => section.entries.length > 0);

  if (
    designSurface !== "metricRow" &&
    designSurface !== "metricWidget" &&
    designSurface !== "dashboardLayout" &&
    designSurface !== "dashboardSection" &&
    designSurface !== "sidebarLayout" &&
    designSurface !== "headerLayout" &&
    designSurface !== "footerLayout"
  ) {
    return sections;
  }

  return sections.map((section) => {
    if (section.id !== "content") {
      return section;
    }

    const dashboardExtras =
      designSurface === "dashboardLayout"
        ? [
            { kind: "user" as const, icon: UserRound },
            { kind: "notification-bell" as const, icon: Bell },
            { kind: "dashboard-section" as const, icon: LayoutGrid },
          ]
        : designSurface === "dashboardSection"
          ? [
              { kind: "user" as const, icon: UserRound },
              { kind: "notification-bell" as const, icon: Bell },
              { kind: "metric-widget" as const, icon: LayoutGrid },
            ]
          : designSurface === "sidebarLayout"
            ? [
                { kind: "user" as const, icon: UserRound },
                { kind: "notification-bell" as const, icon: Bell },
                { kind: "sidebar-nav" as const, icon: PanelLeft },
                { kind: "sidebar-collapse" as const, icon: PanelLeftClose },
              ]
            : designSurface === "headerLayout"
              ? [
                  { kind: "user" as const, icon: UserRound },
                  { kind: "sidebar-trigger" as const, icon: Menu },
                ]
              : designSurface === "footerLayout"
                ? [
                    { kind: "user" as const, icon: UserRound },
                    { kind: "nav-tab" as const, icon: LayoutPanelTop },
                  ]
                : designSurface === "metricWidget"
                  ? [
                      { kind: "metric-kpi" as const, icon: ChartLine },
                      { kind: "metric-derived-kpi" as const, icon: ChartLine },
                      { kind: "query-viewer" as const, icon: ListChecks },
                    ]
                  : [{ kind: "metric-widget" as const, icon: LayoutGrid }];

    return {
      ...section,
      entries: [...section.entries, ...dashboardExtras],
    };
  });
}

const SURFACE_EXTRA_ICONS: Partial<Record<CatalogEntryKind, LucideIcon>> = {
  user: UserRound,
  "notification-bell": Bell,
  "sidebar-nav": PanelLeft,
  "sidebar-collapse": PanelLeftClose,
  "sidebar-trigger": Menu,
  "nav-tab": LayoutPanelTop,
  "metric-widget": LayoutGrid,
  "metric-kpi": ChartLine,
  "metric-derived-kpi": ChartLine,
  "query-viewer": ListChecks,
  "dashboard-section": LayoutGrid,
};

function getComponentCatalogIcon(
  kind: CatalogEntryKind,
): LucideIcon | undefined {
  for (const section of ALL_SECTIONS) {
    const entry = section.entries.find((item) => item.kind === kind);
    if (entry) {
      return entry.icon;
    }
  }

  return SURFACE_EXTRA_ICONS[kind];
}

export function getTreeNodeIcon(kind: CatalogEntryKind): LucideIcon {
  return getComponentCatalogIcon(kind) ?? Columns2;
}

export function getCatalogEntryKey(entry: ComponentCatalogEntry): string {
  return entry.entryId ?? entry.kind;
}
