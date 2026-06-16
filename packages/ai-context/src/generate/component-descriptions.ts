import type { UiComponentKind } from "@repo/ui-builder-core";

export interface ComponentDescription {
  readonly summary: string;
  readonly properties: readonly string[];
  readonly example: string;
}

export const COMPONENT_DESCRIPTIONS: Readonly<
  Record<UiComponentKind, ComponentDescription>
> = {
  container: {
    summary:
      "Structural wrapper (plain div). Holds child rows; insertable from the layout section.",
    properties: ["rows", "stackDirection?", "styles?"],
    example: JSON.stringify(
      {
        kind: "container",
        rows: [],
      },
      null,
      2,
    ),
  },
  text: {
    summary: "Plain text from a field or static value.",
    properties: [
      "primary",
      "fallbacks?",
      "label?",
      "styles?",
      "conditionalStyles?",
    ],
    example: JSON.stringify(
      {
        kind: "text",
        primary: { type: "field", path: "nickname" },
        fallbacks: [
          { type: "field", path: "name" },
          { type: "static", value: "—" },
        ],
        label: {
          show: true,
          text: "Display Name",
          position: "above",
          bold: true,
          color: "muted",
          align: "left",
        },
        conditionalStyles: [{ matchValue: "high", textColor: "danger" }],
      },
      null,
      2,
    ),
  },
  image: {
    summary: "Image field (EntityFileReference) or static URL.",
    properties: [
      "primary",
      "fallbacks?",
      "imageSize?",
      "label?",
      "styles?",
      "conditionalStyles?",
    ],
    example: JSON.stringify(
      {
        kind: "image",
        primary: { type: "field", path: "logo" },
        fallbacks: [
          { type: "static", value: "https://example.com/placeholder.png" },
        ],
        imageSize: 48,
        label: { show: true, text: "Logo", position: "above" },
      },
      null,
      2,
    ),
  },
  icon: {
    summary: "Lucide icon by name.",
    properties: ["iconName", "iconSize?", "label?", "styles?"],
    example: JSON.stringify(
      {
        kind: "icon",
        iconName: "Building2",
        iconSize: 20,
        label: {
          show: true,
          text: "Institution",
          position: "below",
          color: "muted",
        },
      },
      null,
      2,
    ),
  },
  date: {
    summary: "Date/datetime field with optional format.",
    properties: [
      "primary",
      "fallbacks?",
      "dateDisplayFormat?: date | datetime | time",
      "label?",
      "styles?",
      "conditionalStyles?",
    ],
    example: JSON.stringify(
      {
        kind: "date",
        primary: { type: "field", path: "createdAt" },
        fallbacks: [{ type: "static", value: "N/A" }],
        dateDisplayFormat: "datetime",
        label: { show: true, position: "above" },
      },
      null,
      2,
    ),
  },
  numeric: {
    summary: "Number field with currency/percentage formatting.",
    properties: [
      "primary",
      "fallbacks?",
      "displayFormat?: currency | plain | percentage",
      "showCurrency?",
      "showToneColors?",
      "label?",
      "styles?",
      "conditionalStyles?",
    ],
    example: JSON.stringify(
      {
        kind: "numeric",
        primary: { type: "field", path: "amount" },
        displayFormat: "currency",
        label: {
          show: true,
          text: "Balance",
          position: "above",
          align: "right",
        },
      },
      null,
      2,
    ),
  },
  badge: {
    summary:
      "Enum or status field as a badge. Supports value-based conditionalStyles.",
    properties: [
      "primary",
      "fallbacks?",
      "label?",
      "styles?",
      "conditionalStyles?",
    ],
    example: JSON.stringify(
      {
        kind: "badge",
        primary: { type: "field", path: "status" },
        fallbacks: [{ type: "static", value: "UNKNOWN" }],
        label: {
          show: true,
          text: "Account Status",
          position: "above",
          bold: true,
          color: "muted",
        },
        conditionalStyles: [
          {
            matchValue: "ACTIVE",
            badgeVariant: "success",
            background: "success",
          },
          {
            matchValue: "PENDING",
            badgeVariant: "pending",
            background: "warning",
          },
          {
            matchValue: "CLOSED",
            badgeVariant: "closed",
            textColor: "muted",
          },
        ],
      },
      null,
      2,
    ),
  },
  "metric-kpi": {
    summary: "Metric widget KPI bound to a metric definition.",
    properties: [
      "metricDefinitionId",
      "groupBindings",
      "dimensionBindings",
      "label?",
      "styles?",
    ],
    example: JSON.stringify(
      {
        kind: "metric-kpi",
        metricDefinitionId: "metric_total_revenue",
        label: "Total Revenue",
        groupBindings: {
          region: { type: "static", value: "US" },
        },
        dimensionBindings: {
          accountId: { type: "entityField", fieldPath: "id" },
        },
      },
      null,
      2,
    ),
  },
  "metric-widget": {
    summary: "Reference to a reusable metric widget by entity + id.",
    properties: ["entityName", "widgetId", "label?", "styles?"],
    example: JSON.stringify(
      {
        kind: "metric-widget",
        entityName: "account",
        widgetId: "widget_revenue",
      },
      null,
      2,
    ),
  },
  "dashboard-section": {
    summary: "Reference to a reusable tenant dashboard section by id.",
    properties: ["sectionId", "label?", "styles?"],
    example: JSON.stringify(
      {
        kind: "dashboard-section",
        sectionId: "section_overview",
      },
      null,
      2,
    ),
  },
  user: {
    summary:
      "Displays the signed-in user (name, email, photo, or photo with name).",
    properties: [
      "display: name | email | photo | photo-and-name",
      "nameFormat?: full | first",
      "imageSize?",
      "label?",
      "styles?",
    ],
    example: JSON.stringify(
      {
        kind: "user",
        display: "photo-and-name",
        imageSize: 40,
      },
      null,
      2,
    ),
  },
  "form-field": {
    summary: "Editable form input bound to an entity field.",
    properties: [
      "fieldPath",
      "hideLabel?",
      "booleanDisplay?: checkbox | switch",
      "switchVariant?: ios | squared",
      "switchWidth?",
      "switchHeight?",
      "multiline?",
      "multilineRows?",
      "styles?",
    ],
    example: JSON.stringify({ kind: "form-field", fieldPath: "name" }, null, 2),
  },
  "entity-field-selector": {
    summary: "Relation or enum picker.",
    properties: [
      "fieldPath",
      "layout: list | list-with-logo | mini-cards",
      "enableSearch?",
      "cardsPerRow?",
      "imageFieldPath?",
      "styles?",
    ],
    example: JSON.stringify(
      {
        kind: "entity-field-selector",
        fieldPath: "bankId",
        layout: "mini-cards",
      },
      null,
      2,
    ),
  },
  "form-section": {
    summary: "Visual section wrapper with optional title.",
    properties: ["title?", "styles?"],
    example: JSON.stringify(
      { kind: "form-section", title: "Details" },
      null,
      2,
    ),
  },
  "form-actions": {
    summary: "Submit/cancel actions row (plain forms).",
    properties: ["styles?"],
    example: JSON.stringify({ kind: "form-actions" }, null, 2),
  },
  "wizard-progress": {
    summary:
      "Wizard step indicator. Supports conditionalStyles for step status values.",
    properties: [
      "variant?: steps | bar | stepper",
      "stepLabel?",
      "stepSpacing?",
      "circleSize?",
      "labelMaxWidth?",
      "barTrackColor?",
      "barFillColor?",
      "conditionalStyles?",
      "styles?",
    ],
    example: JSON.stringify(
      {
        kind: "wizard-progress",
        variant: "stepper",
        stepLabel: {
          show: true,
          position: "bottom",
          bold: true,
          fontSize: 12,
        },
        conditionalStyles: [
          { matchValue: "active", background: "primary" },
          { matchValue: "completed", background: "success" },
        ],
      },
      null,
      2,
    ),
  },
  "wizard-step-host": {
    summary: "Container for active wizard step content.",
    properties: ["styles?"],
    example: JSON.stringify({ kind: "wizard-step-host" }, null, 2),
  },
  "wizard-actions": {
    summary: "Wizard navigation buttons.",
    properties: [
      "nextLabel?",
      "backLabel?",
      "cancelLabel?",
      "submitCreateLabel?",
      "submitEditLabel?",
      "styles?",
    ],
    example: JSON.stringify({ kind: "wizard-actions" }, null, 2),
  },
  "related-records": {
    summary: "Child entity list on detail view.",
    properties: ["childEntity", "foreignKeyField", "styles?"],
    example: JSON.stringify(
      {
        kind: "related-records",
        childEntity: "transaction",
        foreignKeyField: "accountId",
      },
      null,
      2,
    ),
  },
  "page-header": {
    summary: "Main view page header slot.",
    properties: ["styles?"],
    example: JSON.stringify({ kind: "page-header" }, null, 2),
  },
  "page-toolbar": {
    summary: "Main view toolbar (search, filters, actions).",
    properties: ["styles?"],
    example: JSON.stringify({ kind: "page-toolbar" }, null, 2),
  },
  "page-metrics": {
    summary: "Main view metrics row slot.",
    properties: ["styles?"],
    example: JSON.stringify({ kind: "page-metrics" }, null, 2),
  },
  "page-list": {
    summary: "Main view list container slot.",
    properties: ["styles?"],
    example: JSON.stringify({ kind: "page-list" }, null, 2),
  },
  "view-search": {
    summary:
      "Page-global search control bound to URL `q`; search scope covers all entities in the data model.",
    properties: ["placeholder?", "styles?"],
    example: JSON.stringify(
      { kind: "view-search", placeholder: "Search…" },
      null,
      2,
    ),
  },
  "view-filter": {
    summary:
      "Page-global filter control; pick entity/field pairs from the full data model on demand. Bound to URL `f.{entity}.{field}`.",
    properties: ["filters", "styles?"],
    example: JSON.stringify(
      {
        kind: "view-filter",
        filters: [{ entityName: "account", fieldName: "accountType" }],
      },
      null,
      2,
    ),
  },
};

export function buildComponentAtomMarkdown(kind: UiComponentKind): string {
  const description = COMPONENT_DESCRIPTIONS[kind];
  return `# Component: ${kind}

${description.summary}

**Properties:** ${description.properties.join(", ")}

\`\`\`json
${description.example}
\`\`\`
`;
}

export function componentAtomId(kind: UiComponentKind): string {
  return `ui.components.${kind}`;
}
