export const UI_LAYOUT_BASE_ATOM_ID = "ui.layout.base";

export function buildUiLayoutBaseAtom(): string {
  return `# UiLayoutDocument structure

Recursive layout tree persisted as JSON. Use **grid** for multi-column sections; **container** wraps content at the document root.

## Hierarchy

\`\`\`
UiLayoutDocument
├── showActions?, cardsPerRow?, motion?
└── root
    ├── screen-root (screen scope): gridTemplateColumns, gap?, rows[]
    └── root (component/block scope): columnCount, columns[] → single container row
        └── RowNode (type: "component")
            ├── kind: "container" → rows[] (user content lives here at root)
            └── kind: "grid" → gridTemplateColumns, gap?, rows[] (one row per track)
\`\`\`

**Rules:**
- **Root container:** \`root\` has exactly **one column** with exactly **one** \`container\` component row. User content goes in \`container.rows\`.
- **Multi-column layout:** insert a \`grid\` component row inside \`container.rows\`. Set \`gridTemplateColumns\` (e.g. \`"1fr 1fr"\`, \`"minmax(0, 2fr) minmax(0, 1fr)"\`). Each \`grid.rows[]\` entry is one track — typically a \`container\` holding stacked components.
- **Screen scope:** use \`screen-root\` instead of column \`root\` for full-page layouts (dashboards, custom views).
- Do **not** use \`nested-layout\` — it is deprecated. Use \`grid\` instead.
- Legacy column \`root\` with \`columnCount\` / \`columns[]\` is still accepted on import but normalized to grid at runtime.

## Node types

| Node | type / kind | Key fields |
|------|-------------|------------|
| Screen root | \`screen-root\` | \`id\`, \`gridTemplateColumns\`, \`gap?\`, \`rows[]\`, \`styles?\` |
| Column root | \`root\` | \`id\`, \`columnCount\`, \`columns[]\`, \`styles?\` |
| Component row | \`component\` | \`id\`, \`component\`, \`styles?\`, \`motion?\`, \`displayFrom?\`, \`displayTo?\` |
| Container | \`container\` | \`rows[]\`, \`stackDirection?\`, \`styles?\` |
| Grid | \`grid\` | \`gridTemplateColumns\`, \`gap?\`, \`alignItems?\`, \`rows[]\`, \`styles?\` |

Optional document fields: \`showActions\`, \`cardsPerRow\` (1–4), \`motion\`.

See \`ui.responsive-visibility\` for breakpoint visibility rules.

## List card pattern (recommended)

Root → **container** → **grid** (2 tracks) → left track: text fields, right track: badge/numeric:

\`\`\`
root (1 col)
└── container
    └── grid (2 tracks)
        ├── track-left (container): name, subtitle, …
        └── track-right (container): badge, bold amount
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
          "rows": [{
            "type": "component",
            "id": "row-grid",
            "component": {
              "kind": "grid",
              "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
              "gap": "12px",
              "rows": [
                {
                  "type": "component",
                  "id": "track-left",
                  "component": {
                    "kind": "container",
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
                  }
                },
                {
                  "type": "component",
                  "id": "track-right",
                  "component": {
                    "kind": "container",
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
                        "component": {
                          "kind": "numeric",
                          "primary": { "type": "field", "path": "amount" },
                          "displayFormat": "currency",
                          "styles": [{ "property": "fontWeight", "value": "bold" }]
                        }
                      }
                    ]
                  }
                }
              ]
            }
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

See \`ui.style-layers\` for **where** to attach styles (component vs row wrapper vs grid track).
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
