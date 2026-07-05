export const UI_PERSISTENCE_KEYS_ATOM_ID = "ui.persistence.keys";

export function buildUiPersistenceKeysAtom(): string {
  return `# UI persistence keys

Layouts persist on **entity UI overrides** (\`entity_ui_overrides\`) and tenant dashboard config.

## Entity UI override keys

| Key | Surface | Description |
|-----|---------|-------------|
| \`listItem\` | Item list (card) | Per-record card layout |
| \`listViewType\` | List | \`table\` \\| \`card\` \\| \`expandableTable\` |
| \`mainPage\` | Main view | page-header, page-toolbar, page-metrics, page-list slots |
| \`recordDetail\` | Detail view | Record detail layout |
| \`forms.presentation\` | Forms | \`plain\` or \`wizard\` (derived from preset) |
| \`forms.layout\` | Forms | Plain form layout |
| \`forms.wizard\` | Forms | Wizard shell + steps |
| \`metricWidgets\` | Metrics row | Reusable metric widget definitions |
| \`metricRowLayout\` | Metrics row | Row with metric-widget refs |
| \`views[].fields\` | Table list | Column field paths (table view only) |
| \`views[].columns\` | Expandable table | Grouped columns with \`cellLayout\` |
| \`views[].rowExpandLayout\` | Expandable table | Expanded row panel |

## Tenant presets

| Key | Description |
|-----|-------------|
| \`ui_builder_presets\` | Tenant component/layout presets (Settings → Design layout → Presets) |

## Design-layout slice envelope

Handoff JSON for AI/import uses:

\`\`\`json
{ "kind": "design-layout-slice", "surface": "list", "version": 1, "data": { } }
\`\`\`

Surfaces: \`list\`, \`forms\`, \`mainPage\`, \`recordDetail\`, \`metricsRowDesigner\`.
`;
}
