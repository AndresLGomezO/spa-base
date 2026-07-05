export const UI_PRESETS_PLATFORM_ATOM_ID = "ui.presets.platform";

export function buildUiPresetsPlatformAtom(): string {
  return `# Platform layout presets

Six built-in presets. Designers select via **layout preset picker**; the platform derives \`listViewType\` or form \`presentation\` from the preset — do not set presentation switches separately.

| Preset ID | Label | Surfaces | Sets |
|-----------|-------|----------|------|
| \`plain-form\` | Plain form | formPlain, formCreate, formEdit | \`presentation: "plain"\` |
| \`plain-table-list\` | Plain table list | listItem | \`listViewType: "table"\` |
| \`card-list\` | Card list | listItem | \`listViewType: "card"\` + two-track grid card layout |
| \`expandable-table-list\` | Expandable row | listItem, tableRowExpand | \`listViewType: "expandableTable"\` |
| \`wizard-form\` | Wizard form | formWizardShell | \`presentation: "wizard"\` + shell layout |
| \`kpi-strip\` | KPI strip | metricRow, metricStrip | horizontal metric KPI row |

**Defaults:** \`plain-form\` (forms), \`plain-table-list\` (lists).

Tenant presets are stored in \`ui_builder_presets\` and appear alongside platform presets in the picker.
`;
}
