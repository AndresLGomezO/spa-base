import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
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
  PanelTop,
  Route,
  Search,
  Sparkles,
  TextCursorInput,
  Type,
  UserRound,
} from "lucide-react";
import {
  isComponentKindAllowedOnSurface,
  type DesignSurface,
  type UiComponentKind,
} from "@repo/ui-builder-core";

export type CatalogEntryKind = UiComponentKind | "nested-layout";

export type CatalogSectionId = "layout" | "content" | "form" | "dataControls";

interface ComponentCatalogEntry {
  readonly kind: CatalogEntryKind;
  readonly icon: LucideIcon;
}

interface ComponentCatalogSection {
  readonly id: CatalogSectionId;
  readonly entries: readonly ComponentCatalogEntry[];
}

const LAYOUT_SECTION: ComponentCatalogSection = {
  id: "layout",
  entries: [
    { kind: "container", icon: Box },
    { kind: "nested-layout", icon: Columns2 },
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
    { kind: "view-filter", icon: Filter },
  ],
};

const ALL_SECTIONS: readonly ComponentCatalogSection[] = [
  LAYOUT_SECTION,
  CONTENT_SECTION,
  FORM_SECTION,
  DATA_CONTROLS_SECTION,
];

function isAllowedOnSurface(
  kind: CatalogEntryKind,
  designSurface: DesignSurface,
): boolean {
  if (kind === "nested-layout") {
    return true;
  }

  return isComponentKindAllowedOnSurface(kind, designSurface);
}

export function getFilteredComponentCatalog(
  designSurface: DesignSurface,
): readonly ComponentCatalogSection[] {
  const sections = ALL_SECTIONS.map((section) => ({
    ...section,
    entries: section.entries.filter((entry) =>
      isAllowedOnSurface(entry.kind, designSurface),
    ),
  })).filter((section) => section.entries.length > 0);

  if (
    designSurface !== "metricRow" &&
    designSurface !== "metricWidget" &&
    designSurface !== "dashboardLayout" &&
    designSurface !== "dashboardSection"
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
            { kind: "dashboard-section" as const, icon: LayoutGrid },
          ]
        : designSurface === "dashboardSection"
          ? [
              { kind: "user" as const, icon: UserRound },
              { kind: "metric-widget" as const, icon: LayoutGrid },
            ]
          : designSurface === "metricWidget"
            ? [{ kind: "metric-kpi" as const, icon: ChartLine }]
            : [{ kind: "metric-widget" as const, icon: LayoutGrid }];

    return {
      ...section,
      entries: [...section.entries, ...dashboardExtras],
    };
  });
}

function getComponentCatalogIcon(
  kind: CatalogEntryKind,
): LucideIcon | undefined {
  for (const section of ALL_SECTIONS) {
    const entry = section.entries.find((item) => item.kind === kind);
    if (entry) {
      return entry.icon;
    }
  }

  return undefined;
}

export function getTreeNodeIcon(kind: CatalogEntryKind): LucideIcon {
  return getComponentCatalogIcon(kind) ?? Columns2;
}
