export const UI_DESIGN_HANDBOOK_ROUTER_ATOM_ID = "ui.design-handbook.router";

export function buildUiDesignHandbookRouterAtom(): string {
  return `# UI design handbook index

Human-readable manual: \`docs/ui-design-manual/\`. This fragment is a compact routing index for AI.

## Surfaces → allowed kinds (summary)

| Surface | Key kinds |
|---------|-----------|
| listItem / card | text, image, icon, date, numeric, badge, metric-*, view-search, view-filters, view-date-filter + container, grid |
| table column cell | same as listItem |
| form plain | form-field, entity-field-selector, form-section, form-actions + display kinds |
| form wizard shell | wizard-progress, wizard-step-host, wizard-actions |
| mainPage | page-header, page-toolbar, page-metrics, page-list, view-search, view-filters, view-date-filter |
| recordDetail | display kinds, related-records, metric-*, view-search, view-filters, view-date-filter |
| metricRow | display kinds, metric-widget |
| sidebarLayout | image, icon, text, user, notification-bell, sidebar-nav, sidebar-collapse + container, grid |
| headerLayout | image, icon, text, user, sidebar-trigger + container, grid |
| footerLayout | image, icon, text, user, nav-tab + container, grid |

## Default presets

- Forms: \`plain-form\`
- Lists: \`expandable-table-list\`
- Card lists: \`card-list\`
- Expandable tables: \`expandable-table-list\`
- Wizards: \`wizard-form\`
- KPI rows: \`kpi-strip\`

## Layout rules (grid-only)

1. Root → single \`container\` row
2. Multi-column → \`grid\` with \`gridTemplateColumns\` + one track row per column
3. Do not use \`nested-layout\`
4. Display paths: \`relation.label\`; form paths: \`fieldName\` or \`relationId\`

See \`ui.layout.base\`, \`ui.presets.platform\`, \`ui.import.scopes\`, \`ui.persistence.keys\` for detail.
`;
}
