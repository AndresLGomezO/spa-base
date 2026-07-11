import type { TFunction } from "i18next";
import type { LayoutJsonImportLabels } from "@repo/ui-builder-react";

import { layoutJsonImportLabels } from "../ui-builder/layout-json-import-labels";
import type {
  CatalogEntryKind,
  CatalogSectionId,
  ComponentCatalogEntry,
} from "./form-designer-component-catalog";
import type { StructureTreeLabels } from "./form-designer-structure-tree";
import type { UiComponentKind } from "@repo/ui-builder-core";

export interface FormDesignerComponentsLabels {
  readonly tree: StructureTreeLabels;
  readonly panelTitle: string;
  readonly expandPanel: string;
  readonly collapsePanel: string;
  readonly emptyColumn: string;
  readonly insertAbove: (label: string) => string;
  readonly insertBelow: (label: string) => string;
  readonly insertInColumn: (label: string) => string;
  readonly modalTitle: string;
  readonly modalCancel: string;
  readonly importSectionTitle: string;
  readonly importJsonOption: string;
  readonly templatesSectionTitle: string;
  readonly layoutJsonImport: LayoutJsonImportLabels;
  readonly sectionTitle: (section: CatalogSectionId) => string;
  readonly optionLabel: (
    kind: CatalogEntryKind,
    entry?: ComponentCatalogEntry,
  ) => string;
  readonly wizardScopeShell: string;
  readonly wizardScopeStep: string;
  readonly wizardScopeFooter: string;
  readonly wizardScopeContent: string;
  readonly wizardScopeAriaLabel: string;
  readonly wizardStepLabel: string;
  readonly collapsedStepSelectAriaLabel: string;
  readonly expandNode: (label: string) => string;
  readonly collapseNode: (label: string) => string;
  readonly moveRowUp: string;
  readonly moveRowDown: string;
  readonly deleteRow: string;
}

export function formDesignerComponentsLabels(
  t: TFunction<"common">,
): FormDesignerComponentsLabels {
  const kindDefaults: Partial<Record<UiComponentKind, string>> = {
    text: t("formDesigner.components.options.text"),
    image: t("formDesigner.components.options.image"),
    icon: t("formDesigner.components.options.icon"),
    date: t("formDesigner.components.options.date"),
    numeric: t("formDesigner.components.options.numeric"),
    badge: t("formDesigner.components.options.badge"),
    "form-field": t("formDesigner.components.options.formField"),
    "entity-field-selector": t(
      "formDesigner.components.options.entityFieldSelector",
    ),
    "form-section": t("formDesigner.components.options.formSection"),
    "form-actions": t("formDesigner.components.options.formActions"),
    "wizard-progress": t("formDesigner.components.options.wizardProgress"),
    "wizard-step-host": t("formDesigner.components.options.wizardStepHost"),
    "wizard-actions": t("formDesigner.components.options.wizardActions"),
    "page-header": t("mainViewDesigner.components.pageHeader"),
    "page-toolbar": t("mainViewDesigner.components.pageToolbar"),
    "page-metrics": t("mainViewDesigner.components.pageMetrics"),
    "page-list": t("mainViewDesigner.components.pageList"),
    "metric-kpi": t("detailViewDesigner.components.metricKpi"),
    "metric-derived-kpi": t("metricsRowDesigner.components.metricDerivedKpi"),
    "metric-widget": t("metricsRowDesigner.components.metricWidget"),
    "query-viewer": t("metricsRowDesigner.components.queryViewer"),
    "view-search": t("viewFilterComponents.search"),
    "view-filters": t("viewFilterComponents.filters"),
    "view-date-filter": t("viewFilterComponents.dateFilter"),
    "dashboard-section": t(
      "dashboardLayoutDesigner.components.dashboardSection",
    ),
    user: t("dashboardLayoutDesigner.components.user"),
    "notification-bell": t(
      "dashboardLayoutDesigner.components.notificationBell",
    ),
    "sidebar-nav": t("sidebarLayoutDesigner.components.sidebarNav"),
    "sidebar-collapse": t("sidebarLayoutDesigner.components.sidebarCollapse"),
    "sidebar-trigger": t("sidebarLayoutDesigner.components.sidebarTrigger"),
    "nav-tab": t("sidebarLayoutDesigner.components.navTab"),
    chart: t("formDesigner.components.options.chart"),
    "related-records": t("detailViewDesigner.components.relatedRecords"),
  };

  return {
    tree: {
      column: (column) => t("entity.viewSettings.columnTab", { column }),
      track: (track) => t("formDesigner.components.gridTrack", { track }),
      grid: (trackCount) =>
        t("formDesigner.components.gridLayout", { count: trackCount }),
      container: t("formDesigner.components.container"),
      section: t("formDesigner.components.section"),
      actions: t("formDesigner.components.actions"),
      hiddenField: (label) =>
        t("formDesigner.components.hiddenField", { label }),
      kindDefaults,
    },
    panelTitle: t("formDesigner.components.panelTitle"),
    expandPanel: t("formDesigner.components.expandPanel"),
    collapsePanel: t("formDesigner.components.collapsePanel"),
    emptyColumn: t("formDesigner.components.emptyColumn"),
    insertAbove: (label) => t("formDesigner.components.insertAbove", { label }),
    insertBelow: (label) => t("formDesigner.components.insertBelow", { label }),
    insertInColumn: (label) =>
      t("formDesigner.components.insertInColumn", { label }),
    modalTitle: t("formDesigner.components.modalTitle"),
    modalCancel: t("formDesigner.components.modalCancel"),
    importSectionTitle: t("formDesigner.components.importSectionTitle"),
    importJsonOption: t("formDesigner.components.importJsonOption"),
    templatesSectionTitle: t("formDesigner.components.templatesSectionTitle"),
    layoutJsonImport: layoutJsonImportLabels(t),
    sectionTitle: (section) => {
      switch (section) {
        case "layout":
          return t("formDesigner.components.sections.layout");
        case "content":
          return t("formDesigner.components.sections.content");
        case "charts":
          return t("formDesigner.components.sections.charts");
        case "form":
          return t("formDesigner.components.sections.form");
        case "dataControls":
          return t("formDesigner.components.sections.dataControls");
      }
    },
    optionLabel: (kind, entry) => {
      if (entry?.entryId === "chart-line") {
        return t("formDesigner.components.options.chartLine");
      }
      if (entry?.entryId === "chart-area") {
        return t("formDesigner.components.options.chartArea");
      }
      if (kind === "grid") {
        return t("formDesigner.components.container");
      }
      if (kind === "container") {
        return t("formDesigner.components.container");
      }

      return kindDefaults[kind] ?? kind;
    },
    wizardScopeShell: t("formDesigner.components.wizardScopeShell"),
    wizardScopeStep: t("formDesigner.components.wizardScopeStep"),
    wizardScopeFooter: t("formDesigner.components.wizardScopeFooter"),
    wizardScopeContent: t("formDesigner.components.wizardScopeContent"),
    wizardScopeAriaLabel: t("formDesigner.components.wizardScopeAriaLabel"),
    wizardStepLabel: t("formDesigner.components.wizardStepLabel"),
    collapsedStepSelectAriaLabel: t(
      "formDesigner.components.collapsedStepSelectAriaLabel",
    ),
    expandNode: (label) => t("formDesigner.components.expandNode", { label }),
    collapseNode: (label) =>
      t("formDesigner.components.collapseNode", { label }),
    moveRowUp: t("entity.viewSettings.moveSlotUp"),
    moveRowDown: t("entity.viewSettings.moveSlotDown"),
    deleteRow: t("entity.viewSettings.deleteSlot"),
  };
}
