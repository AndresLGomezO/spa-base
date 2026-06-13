export const UI_STYLE_LAYERS_ATOM_ID = "ui.style-layers";

export function buildUiStyleLayersAtom(): string {
  return `# Style attachment layers

Styles are \`StyleRule[]\` arrays: \`{ "property": "<key>", "value": "<token or css>" }\`.

See \`theme.style-rules\` for the full property enum and color vs pixel conventions.

## Three layout style layers

| Layer | JSON path | Purpose |
|-------|-----------|---------|
| **Component styles** | \`component.styles[]\` | Typography, colors, padding on the component slot; flex self-alignment |
| **Row wrapper styles** | \`row.styles[]\` on \`type: "component"\` rows | Outer row container — margins, background, border around the component |
| **Column styles** | \`column.styles[]\` | Column shell — stack alignment, column background/padding |

### Style application at render time

| Attachment | Container styles | Text/value styles |
|------------|------------------|-------------------|
| \`component.styles\` | padding, background, border, size | \`color\`, \`fontSize\`, \`fontWeight\`, \`textAlign\`, … |
| \`row.styles\` (component row) | merged on row wrapper | — |
| \`column.styles\` | column shell | — |

Use **row.styles** for spacing between fields; use **component.styles** for how the value looks.

## Nested-layout row styles (responsive grid)

On \`type: "nested-layout"\` rows, \`styles[]\` controls the horizontal column grid:

| Property | Purpose |
|----------|---------|
| \`gridColumns\` | Column count at \`base\` breakpoint |
| \`gridColumnsSm\`, \`gridColumnsMd\`, \`gridColumnsLg\`, \`gridColumnsXl\` | Column count per breakpoint |
| \`gridAutoFitMinWidth\` | Auto-fit min column width (px) |
| \`gridResponsiveMode\` | \`fixed\` \\| \`autoFit\` |
| \`gap\` | Horizontal gap between nested columns |

Responsive grid rules apply to **root.styles** and **nested-layout row styles** only — not \`column.styles\` or component rows.

## Root node styles

\`root.styles[]\` — top-level grid for root columns (same responsive grid properties as nested-layout).

## Examples

**Bold value on component, padded row wrapper:**

\`\`\`json
{
  "type": "component",
  "id": "row_amount",
  "styles": [{ "property": "padding", "value": "8px" }],
  "component": {
    "kind": "numeric",
    "primary": { "type": "field", "path": "amount" },
    "styles": [{ "property": "fontWeight", "value": "bold" }]
  }
}
\`\`\`

**Two-column nested grid (tablet+):**

\`\`\`json
{
  "type": "nested-layout",
  "id": "row_grid",
  "columnCount": 2,
  "styles": [
    { "property": "gridColumns", "value": "1" },
    { "property": "gridColumnsMd", "value": "2" },
    { "property": "gap", "value": "16px" }
  ],
  "columns": []
}
\`\`\`
`;
}
