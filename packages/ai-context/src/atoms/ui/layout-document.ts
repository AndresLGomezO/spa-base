export const UI_LAYOUT_BASE_ATOM_ID = "ui.layout.base";

export function buildUiLayoutBaseAtom(): string {
  return `# UiLayoutDocument structure

Recursive layout tree persisted as JSON. Almost all layouts use nested columns and rows.

## Hierarchy

\`\`\`
UiLayoutDocument
├── showActions?, cardsPerRow?, motion?
└── root (type: "root", id, columnCount, columns[], styles?)
    └── ColumnNode (id, rows[], widthPercent?, stackDirection?, styles?, displayFrom?, displayTo?)
        └── RowNode
            ├── type: "component" → component config + row.styles? + row.motion? + displayFrom/To?
            │   └── kind: "container" → rows[] (user content lives here at root)
            └── type: "nested-layout" → columnCount, columns[] (recursive ColumnNode), styles?, displayFrom/To?
\`\`\`

**Rules:**
- **Root container:** \`root\` has exactly **one column** with exactly **one** \`container\` component row. User content (components, nested-layout rows) goes in \`container.rows\`.
- \`nested-layout\` may appear inside the root container (or deeper) for multi-column sections — not as the root row itself.
- \`columnCount\` must equal \`columns.length\` (integer 1–6) on root and nested-layout rows.
- Columns stack rows vertically by default (\`stackDirection: "column"\`); use \`"row"\` for horizontal stacking within a column.
- \`widthPercent\` (1–100) sets column share; omitted = equal split.

## Node types

| Node | type | Key fields |
|------|------|------------|
| Root | \`root\` | \`id\`, \`columnCount\`, \`columns[]\`, \`styles?\` |
| Column | — | \`id\`, \`rows[]\`, \`widthPercent?\`, \`stackDirection?\`, \`styles?\`, \`displayFrom?\`, \`displayTo?\` |
| Component row | \`component\` | \`id\`, \`component\`, \`styles?\`, \`motion?\`, \`displayFrom?\`, \`displayTo?\` |
| Container component | \`container\` (in component row) | \`rows[]\`, \`stackDirection?\`, \`styles?\` |
| Nested layout | \`nested-layout\` | \`id\`, \`columnCount\`, \`columns[]\`, \`styles?\`, \`displayFrom?\`, \`displayTo?\` |

Optional document fields: \`showActions\`, \`cardsPerRow\` (1–4), \`motion\`.

See \`ui.responsive-visibility\` for breakpoint visibility rules.

## List card pattern (recommended)

Root has **one column** with a **container** row; multi-column content uses **nested-layout** inside \`container.rows\`:

\`\`\`
root (1 col)
└── container
    └── nested-layout (2 cols)
        ├── col-left: text rows (name, subtitle, …)
        └── col-right: badge, numeric, bold text
\`\`\`

\`\`\`json
{
  "showActions": true,
  "root": {
    "type": "root",
    "id": "root-1",
    "columnCount": 1,
    "columns": [{
      "id": "col-root",
      "rows": [{
        "type": "component",
        "id": "row-container",
        "component": {
          "kind": "container",
          "stackDirection": "column",
          "rows": [{
            "type": "nested-layout",
            "id": "row-nested",
            "columnCount": 2,
            "styles": [
              { "property": "gridColumns", "value": "1" },
              { "property": "gridColumnsMd", "value": "2" },
              { "property": "gap", "value": "12px" }
            ],
            "columns": [
              {
                "id": "col-left",
                "rows": [
                  {
                    "type": "component",
                    "id": "row-name",
                    "component": {
                      "kind": "text",
                      "primary": { "type": "field", "path": "name" },
                      "label": { "show": true }
                    }
                  },
                  {
                    "type": "component",
                    "id": "row-subtitle",
                    "component": {
                      "kind": "text",
                      "primary": { "type": "field", "path": "bank.name" },
                      "label": { "show": false }
                    }
                  }
                ]
              },
              {
                "id": "col-right",
                "rows": [
                  {
                    "type": "component",
                    "id": "row-status",
                    "component": {
                      "kind": "badge",
                      "primary": { "type": "field", "path": "status" },
                      "label": { "show": true, "text": "Status", "position": "above" }
                    }
                  },
                  {
                    "type": "component",
                    "id": "row-amount",
                    "styles": [{ "property": "padding", "value": "4px" }],
                    "component": {
                      "kind": "numeric",
                      "primary": { "type": "field", "path": "amount" },
                      "displayFormat": "currency",
                      "styles": [{ "property": "fontWeight", "value": "bold" }]
                    }
                  }
                ]
              }
            ]
          }]
        }
      }]
    }]
  }
}
\`\`\`

## Minimal flat example

\`\`\`json
{
  "root": {
    "type": "root",
    "id": "root-1",
    "columnCount": 1,
    "columns": [{
      "id": "col-1",
      "rows": [{
        "type": "component",
        "id": "row-container",
        "component": {
          "kind": "container",
          "rows": [{
            "type": "component",
            "id": "row-1",
            "component": { "kind": "text", "primary": { "type": "field", "path": "name" } }
          }]
        }
      }]
    }]
  }
}
\`\`\`
`;
}

export const UI_STYLE_RULES_ATOM_ID = "ui.style-rules";

export function buildUiStyleRulesAtom(): string {
  return `# Style rules on layout nodes

Attach \`styles: StyleRule[]\` as \`{ "property": "<key>", "value": "<token or css>" }\`.

See \`ui.style-layers\` for **where** to attach styles (component vs row wrapper vs column vs nested grid).
See \`theme.style-rules\` for the full property enum and color vs pixel conventions.
`;
}

export const UI_DATA_SOURCES_ATOM_ID = "ui.data-sources";

export function buildUiDataSourcesAtom(): string {
  return `# Data sources

Bind display component values to entity data or static content.

## DataSource shapes

| Type | Shape | Use |
|------|-------|-----|
| Field | \`{ "type": "field", "path": "fieldName" }\` | Entity field or \`relation.subfield\` |
| Static | \`{ "type": "static", "value": "Hello" }\` | Fixed text or image URL |

Display components (\`text\`, \`image\`, \`date\`, \`numeric\`, \`badge\`) use \`primary\` and optional \`fallbacks[]\`.

## Resolution order

1. If \`primary.type === "static"\` and value is non-empty → use static value.
2. Else try each \`fallbacks[]\` entry in order — first non-empty **static** wins.
3. Else walk **field** paths: \`primary\`, then each fallback field path in order; first present value wins.
4. If nothing present, last field path is used (may render empty).

Fallback entries can be field or static — use static fallbacks for placeholders when data is missing.

## Path conventions

**Display / list / detail paths** (relation labels): \`bank.name\`, \`provider.code\` — not FK fields like \`bankId\`.

**Form field paths**: direct field names — \`bankId\`, \`status\`, \`logo\`.

## Examples

**Static text (no entity field):**

\`\`\`json
{
  "kind": "text",
  "primary": { "type": "static", "value": "No account selected" }
}
\`\`\`

**Field with static fallback:**

\`\`\`json
{
  "kind": "text",
  "primary": { "type": "field", "path": "nickname" },
  "fallbacks": [
    { "type": "field", "path": "name" },
    { "type": "static", "value": "—" }
  ]
}
\`\`\`

**Static image URL:**

\`\`\`json
{
  "kind": "image",
  "primary": { "type": "static", "value": "https://example.com/logo.png" },
  "imageSize": 48
}
\`\`\`

**Image field with static fallback:**

\`\`\`json
{
  "kind": "image",
  "primary": { "type": "field", "path": "logo" },
  "fallbacks": [{ "type": "static", "value": "/assets/placeholder.png" }]
}
\`\`\`

For \`metric-kpi\` bindings see \`ui.metric-bindings\`.
`;
}
