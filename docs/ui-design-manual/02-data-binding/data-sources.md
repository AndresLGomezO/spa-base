# Data sources

Display components (`text`, `image`, `icon`, `date`, `numeric`, `badge`) bind values through **DataSource** objects on `primary` and optional `fallbacks[]`.

Form components use `fieldPath` instead — see [Form field paths](./form-field-paths.md).

---

## DataSource shapes

| Type | Shape | Use |
|------|-------|-----|
| **Field** | `{ "type": "field", "path": "fieldName" }` | Entity field or relation subfield |
| **Static** | `{ "type": "static", "value": "Hello" }` | Fixed text, image URL, or placeholder |

Additional source types exist for specialized cases (`currentDate`, `enumValue`) but field and static cover most design work.

---

## Resolution order

When rendering a display component:

1. If `primary.type === "static"` and value is non-empty → use the static value.
2. Else try each `fallbacks[]` entry **in order** — first non-empty **static** wins.
3. Else walk **field** paths: `primary`, then each fallback field path in order; first present value wins.
4. If nothing is present, the last field path is used (may render empty).

Fallback entries may be field or static. Use static fallbacks for placeholders when data is missing.

---

## Display paths vs form paths

| Context | Path style | Example |
|---------|------------|---------|
| List, card, detail, table cell | Relation **labels** (display paths) | `bank.name`, `provider.code` |
| Form `form-field` | Direct **field names** (FK ids) | `bankId`, `status` |

**Display rule:** prefer the human-readable related field (`bank.name`), not the foreign key (`bankId`).

**Alias rule:** `bank.name` and `bankId.name` may both resolve when `bankId` is the relation field — prefer the shorter display form.

---

## Examples

### Static text (no entity field)

```json
{
  "kind": "text",
  "primary": { "type": "static", "value": "No account selected" },
  "label": { "show": true, "text": "Status" }
}
```

### Field with static fallback

```json
{
  "kind": "text",
  "primary": { "type": "field", "path": "nickname" },
  "fallbacks": [
    { "type": "field", "path": "name" },
    { "type": "static", "value": "—" }
  ],
  "label": { "show": false }
}
```

Resolution: use `nickname` if present → else `name` → else em dash.

### Static image URL

```json
{
  "kind": "image",
  "primary": { "type": "static", "value": "https://cdn.example.com/logo.png" },
  "imageSize": 48
}
```

### Image field with static fallback

```json
{
  "kind": "image",
  "primary": { "type": "field", "path": "logo" },
  "fallbacks": [
    { "type": "static", "value": "/assets/placeholder.png" }
  ],
  "imageSize": 40
}
```

### Currency numeric

```json
{
  "kind": "numeric",
  "primary": { "type": "field", "path": "balance" },
  "displayFormat": "currency",
  "label": { "show": true, "text": "Balance" }
}
```

### Badge with relation path

```json
{
  "kind": "badge",
  "primary": { "type": "field", "path": "status" },
  "label": { "show": true, "text": "Status", "position": "above" }
}
```

### Date field

```json
{
  "kind": "date",
  "primary": { "type": "field", "path": "createdAt" },
  "dateDisplayFormat": "datetime",
  "label": { "show": true, "text": "Created" }
}
```

---

## Grid card with mixed sources

```json
{
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
            "id": "row-bank",
            "component": {
              "kind": "text",
              "primary": { "type": "field", "path": "bank.name" },
              "fallbacks": [
                { "type": "static", "value": "Unknown bank" }
              ],
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
```

---

## Components that use DataSource

| Component | Fields |
|-----------|--------|
| `text` | `primary`, `fallbacks?` |
| `image` | `primary`, `fallbacks?` |
| `icon` | `primary`, `fallbacks?` |
| `date` | `primary`, `fallbacks?` |
| `numeric` | `primary`, `fallbacks?` |
| `badge` | `primary`, `fallbacks?` |

Metric components use `groupBindings` / `dimensionBindings` instead — see [Metric bindings](./metric-bindings.md).

---

## Related

- [Form field paths](./form-field-paths.md) — editable form bindings
- [Metric bindings](./metric-bindings.md) — KPI data sources
