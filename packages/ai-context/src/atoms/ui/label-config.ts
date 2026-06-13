import type { UiComponentKind } from "@repo/ui-builder-core";

export const UI_LABEL_CONFIG_ATOM_ID = "ui.label-config";

const LABEL_CONFIG_KINDS: readonly UiComponentKind[] = [
  "text",
  "image",
  "date",
  "numeric",
  "badge",
  "icon",
  "wizard-progress",
];

export function componentSupportsLabelConfig(kind: string): boolean {
  return (LABEL_CONFIG_KINDS as readonly string[]).includes(kind);
}

export function buildUiLabelConfigAtom(): string {
  return `# Label configuration

Display components and icons use \`label?: LabelConfig\` on the component config.

## LabelConfig shape

| Property | Type | Description |
|----------|------|-------------|
| \`show\` | boolean | \`false\` → no label rendered |
| \`text\` | string | Custom label text; omit → auto from field path / entity metadata |
| \`position\` | \`above\` \\| \`below\` | Label position relative to value (default: \`above\`) |
| \`bold\` | boolean | Bold label text |
| \`thin\` | boolean | Thin/light label text |
| \`italic\` | boolean | Italic label |
| \`underline\` | boolean | Underline label |
| \`color\` | TextColorToken | \`default\` \\| \`muted\` \\| \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` |
| \`align\` | \`left\` \\| \`center\` \\| \`right\` | Label alignment |

**Value** font weight/size uses \`component.styles\` (e.g. \`{ "property": "fontWeight", "value": "bold" }\`), not \`LabelConfig\`.

## Example

\`\`\`json
{
  "kind": "badge",
  "primary": { "type": "field", "path": "status" },
  "label": {
    "show": true,
    "text": "Account Status",
    "position": "above",
    "bold": true,
    "color": "muted",
    "align": "left"
  }
}
\`\`\`

## Exceptions (different shapes)

| Component | Label prop | Shape |
|-----------|------------|-------|
| \`metric-kpi\`, \`metric-widget\` | \`label?\` | Plain string (not LabelConfig) |
| \`form-field\` | \`hideLabel?\` | Boolean — \`true\` hides the field label |
| \`form-section\` | \`title?\` | Plain string section heading |
| \`wizard-progress\` | \`stepLabel?\` | \`WizardStepLabelConfig\` (see below) |
| \`wizard-actions\` | \`nextLabel?\`, \`backLabel?\`, etc. | Plain strings for button text |

### WizardStepLabelConfig (\`wizard-progress.stepLabel\`)

| Property | Type |
|----------|------|
| \`show\` | boolean |
| \`position\` | \`top\` \\| \`bottom\` \\| \`left\` \\| \`right\` \\| \`hidden\` |
| \`bold\`, \`thin\`, \`italic\`, \`underline\` | boolean |
| \`color\` | string (CSS or token) |
| \`align\` | \`left\` \\| \`center\` \\| \`right\` |
| \`fontSize\` | number (px) |
`;
}
