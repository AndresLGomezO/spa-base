export type HarvestedMessages = Record<string, string>;

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function setMessage(
  out: HarvestedMessages,
  key: string,
  value: unknown,
): void {
  if (typeof value !== "string") return;
  // Keep leading/trailing spaces (e.g. "Good morning, ") but skip blanks.
  if (!value.trim()) return;
  out[key] = value;
}

function looksLikeCssOrToken(value: string): boolean {
  return (
    value.startsWith("var(") ||
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl") ||
    /^[\d.]+(%|px|rem|em|vh|vw)?$/.test(value) ||
    value === "auto" ||
    value === "none" ||
    value === "wrap" ||
    value === "center" ||
    value === "between" ||
    value === "absolute" ||
    value === "relative" ||
    value === "column" ||
    value === "row" ||
    value === "1fr" ||
    value.includes("fr ")
  );
}

function harvestStaticPrimary(
  out: HarvestedMessages,
  key: string,
  primary: unknown,
): void {
  if (
    !isPlainObject(primary) ||
    primary.type !== "static" ||
    typeof primary.value !== "string" ||
    !primary.value.trim() ||
    looksLikeCssOrToken(primary.value)
  ) {
    return;
  }
  setMessage(out, key, primary.value);
}

/**
 * Harvest layout strings using stable `{prefix}.{nodeId}.*` keys
 * (no array-index path segments). Also reads `component.primary`.
 */
export function harvestLayoutStrings(
  out: HarvestedMessages,
  prefix: string,
  node: unknown,
): void {
  if (Array.isArray(node)) {
    for (const child of node) {
      harvestLayoutStrings(out, prefix, child);
    }
    return;
  }
  if (!isPlainObject(node)) return;

  const id = typeof node.id === "string" ? node.id.trim() : "";
  if (id) {
    if (typeof node.label === "string") {
      setMessage(out, `${prefix}.${id}.label`, node.label);
    }
    if (typeof node.name === "string" && !looksLikeCssOrToken(node.name)) {
      setMessage(out, `${prefix}.${id}.name`, node.name);
    }
    harvestStaticPrimary(out, `${prefix}.${id}.static`, node.primary);

    const component = node.component;
    if (isPlainObject(component)) {
      if (typeof component.label === "string") {
        setMessage(out, `${prefix}.${id}.label`, component.label);
      }
      harvestStaticPrimary(out, `${prefix}.${id}.static`, component.primary);
      for (const [key, child] of Object.entries(component)) {
        if (key === "primary" || key === "label" || key === "styles") continue;
        harvestLayoutStrings(out, prefix, child);
      }
    }
  }

  for (const [key, child] of Object.entries(node)) {
    if (
      key === "styles" ||
      key === "className" ||
      key === "primary" ||
      key === "label" ||
      key === "name" ||
      key === "component"
    ) {
      continue;
    }
    harvestLayoutStrings(out, prefix, child);
  }
}

export function harvestEntityDefinition(
  out: HarvestedMessages,
  data: Record<string, unknown>,
): void {
  const entityName = typeof data.name === "string" ? data.name : null;
  if (!entityName) return;

  setMessage(out, `entity.${entityName}.label`, data.label);
  setMessage(out, `entity.${entityName}.description`, data.description);

  const ui = isPlainObject(data.ui) ? data.ui : null;
  const nav = ui && isPlainObject(ui.nav) ? ui.nav : null;
  if (nav) {
    setMessage(out, `entity.${entityName}.nav.label`, nav.label);
  }

  const fields = Array.isArray(data.fields) ? data.fields : [];
  for (const field of fields) {
    if (!isPlainObject(field) || typeof field.name !== "string") continue;
    const fieldName = field.name;
    const fieldUi = isPlainObject(field.ui) ? field.ui : null;
    if (!fieldUi) continue;
    setMessage(
      out,
      `entity.${entityName}.fields.${fieldName}.ui.label`,
      fieldUi.label,
    );
    setMessage(
      out,
      `entity.${entityName}.fields.${fieldName}.ui.placeholder`,
      fieldUi.placeholder,
    );
    setMessage(
      out,
      `entity.${entityName}.fields.${fieldName}.ui.helpText`,
      fieldUi.helpText,
    );
  }
}

export function harvestEntityCategory(
  out: HarvestedMessages,
  data: Record<string, unknown>,
): void {
  if (typeof data.id !== "string") return;
  setMessage(out, `entityCategory.${data.id}.name`, data.name);
}

export function harvestNamedCatalogItem(
  out: HarvestedMessages,
  kindPrefix: string,
  data: Record<string, unknown>,
  idField: "name" | "viewId" = "name",
): void {
  const id =
    typeof data[idField] === "string"
      ? (data[idField] as string)
      : typeof data.name === "string"
        ? data.name
        : null;
  if (!id) return;

  setMessage(out, `${kindPrefix}.${id}.name`, data.name);
  setMessage(out, `${kindPrefix}.${id}.description`, data.description);

  const nav = isPlainObject(data.nav) ? data.nav : null;
  if (nav) {
    setMessage(out, `${kindPrefix}.${id}.nav.label`, nav.label);
  }

  const series = Array.isArray(data.series) ? data.series : [];
  for (const entry of series) {
    if (!isPlainObject(entry) || typeof entry.id !== "string") continue;
    setMessage(
      out,
      `${kindPrefix}.${id}.series.${entry.id}.label`,
      entry.label,
    );
  }
}

export function harvestUiOverride(
  out: HarvestedMessages,
  data: Record<string, unknown>,
): void {
  const entityName =
    typeof data.entityName === "string" ? data.entityName : null;
  if (!entityName) return;

  const recordDetail = isPlainObject(data.recordDetail)
    ? data.recordDetail
    : null;
  const tabs =
    recordDetail && Array.isArray(recordDetail.tabs)
      ? recordDetail.tabs
      : Array.isArray(data.tabs)
        ? data.tabs
        : [];

  for (const [index, tab] of tabs.entries()) {
    if (!isPlainObject(tab)) continue;
    const tabId =
      typeof tab.id === "string"
        ? tab.id
        : typeof tab.key === "string"
          ? tab.key
          : `tab${index}`;
    setMessage(out, `uiOverride.${entityName}.tabs.${tabId}.label`, tab.label);
  }

  if (recordDetail) {
    harvestLayoutStrings(out, `uiOverride.${entityName}`, recordDetail);
  }

  const metricWidgets = Array.isArray(data.metricWidgets)
    ? data.metricWidgets
    : [];
  for (const widget of metricWidgets) {
    if (!isPlainObject(widget) || typeof widget.id !== "string") continue;
    const widgetId = widget.id;
    setMessage(out, `metricWidget.${entityName}.${widgetId}.name`, widget.name);
    if (widget.layout) {
      harvestLayoutStrings(
        out,
        `metricWidget.${entityName}.${widgetId}`,
        widget.layout,
      );
    }
  }

  if (data.metricRowLayout) {
    harvestLayoutStrings(out, `metricRow.${entityName}`, data.metricRowLayout);
  }
}

export function harvestSidebarLayout(
  out: HarvestedMessages,
  sidebar: Record<string, unknown>,
): void {
  setMessage(out, "sidebar.description", sidebar.description);
  harvestLayoutStrings(out, "sidebar", sidebar.sidebarLayout ?? sidebar);
  if (sidebar.headerLayout) {
    harvestLayoutStrings(out, "sidebar", sidebar.headerLayout);
  }
  if (sidebar.footerLayout) {
    harvestLayoutStrings(out, "sidebar", sidebar.footerLayout);
  }
}

export function harvestDashboardLayout(
  out: HarvestedMessages,
  dashboard: Record<string, unknown>,
): void {
  setMessage(out, "dashboard.description", dashboard.description);
  harvestLayoutStrings(
    out,
    "dashboard",
    dashboard.dashboardLayout ?? dashboard,
  );
  const sections = Array.isArray(dashboard.dashboardSections)
    ? dashboard.dashboardSections
    : [];
  for (const section of sections) {
    if (!isPlainObject(section) || typeof section.id !== "string") continue;
    setMessage(out, `dashboard.section.${section.id}.name`, section.name);
    if (section.layout) {
      harvestLayoutStrings(out, "dashboard", section.layout);
    }
  }
}

export function sortHarvestedMessages(
  out: HarvestedMessages,
): HarvestedMessages {
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => a.localeCompare(b)),
  );
}
