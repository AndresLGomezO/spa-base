# Import scopes

The layout JSON import dialog accepts four **import scopes**. Each scope defines the JSON shape you paste or upload, the validation rules applied, and where the result is merged in the layout tree.

Import validation is surface-aware: component kinds must be allowed on the active `designSurface`.

---

## Scope overview

| Scope | JSON root shape | Typical use |
|-------|-----------------|-------------|
| `layout-document` | `UiLayoutDocument` (`{ "root": … }`) | Replace entire layout |
| `column` | `ColumnNode` (`{ "id", "rows": [] }`) | Replace one root column |
| `component-row` | `ComponentRowNode` (`{ "type": "component", … }`) | Replace one row in place |
| `insertable-row` | `ComponentRowNode` | Insert a new row (add, not replace) |

---

## layout-document

Replaces the full layout document for the current designer context.

### Shape

```json
{
  "root": {
    "type": "root",
    "id": "root-1",
    "columnCount": 1,
    "columns": [
      {
        "id": "col-1",
        "rows": [
          {
            "type": "component",
            "id": "row-container",
            "component": {
              "kind": "container",
              "rows": [
                {
                  "type": "component",
                  "id": "row-grid",
                  "component": {
                    "kind": "grid",
                    "gridTemplateColumns": "1fr 1fr",
                    "gap": "16px",
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
                            }
                          ]
                        }
                      },
                      {
                        "type": "component",
                        "id": "track-right",
                        "component": {
                          "kind": "container",
                          "rows": []
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

### Validation

- Full `uiLayoutDocumentSchema` parse
- All component kinds checked against `designSurface`
- Field path semantics validated (form `fieldPath` vs display `primary.path`)
- Wizard shell rules when surface is `formWizardShell`
- IDs regenerated on apply to avoid collisions

### When to use

- Starting a layout from an exported document
- Applying a tenant preset of kind `layout-document`
- Bulk replacement after AI-assisted authoring

---

## column

Replaces a single column node within the root.

### Shape

```json
{
  "id": "col-1",
  "rows": [
    {
      "type": "component",
      "id": "row-container",
      "component": {
        "kind": "container",
        "rows": [
          {
            "type": "component",
            "id": "row-text",
            "component": {
              "kind": "text",
              "primary": { "type": "field", "path": "name" },
              "label": { "show": true }
            }
          }
        ]
      }
    }
  ]
}
```

### Validation

- `columnNodeSchema` parse
- No surface component-kind check (column is structural)
- No field path validation at column scope

### When to use

- Swapping content in one root column without touching the document shell
- Applying a tenant preset of kind `column`

---

## component-row

Replaces an existing row node in the layout tree.

### Shape

```json
{
  "type": "component",
  "id": "row-name",
  "component": {
    "kind": "text",
    "primary": { "type": "field", "path": "name" },
    "label": { "show": true, "text": "Account Name" }
  }
}
```

### Validation

- `componentRowSchema` parse
- Component kind checked against `designSurface`
- Field path semantics validated on the row subtree
- IDs regenerated in the imported subtree on apply

### When to use

- Updating a single component without re-importing the full document
- Applying a tenant preset of kind `component-row`
- Sharing a row template between designers

---

## insertable-row

Inserts a new row rather than replacing the selected row. JSON shape is identical to `component-row`.

### Shape

```json
{
  "type": "component",
  "id": "row-badge",
  "component": {
    "kind": "badge",
    "primary": { "type": "field", "path": "status" }
  }
}
```

### Validation

- Must parse as a component row (`"type": "component"`)
- Same surface and field path checks as `component-row`
- Rejected if root JSON is not a component row

### When to use

- Adding a new component row at the insertion point in the tree
- Importing a row fragment from an external source without overwriting siblings

---

## Scope vs design surface

Import scope controls **JSON shape**. Design surface controls **allowed component kinds**.

Example: importing a `layout-document` while designing a card list item sets `designSurface: "listItem"`. A `form-field` component in the JSON will fail validation because `form-field` is not allowed on `listItem`.

| Designer context | Typical `designSurface` | Typical scope |
|------------------|-------------------------|---------------|
| Card list item | `listItem` | `layout-document` |
| Table column cell | `tableColumnCell` | `layout-document` |
| Form body | `formPlain` | `layout-document` |
| Selected row in tree | (context surface) | `component-row` or `insertable-row` |
| Full page replace | `mainPage` | `layout-document` |

---

## Partial import vs envelope import

| Mechanism | Granularity | Envelope |
|-----------|-------------|----------|
| Layout JSON import (scopes above) | Layout tree fragments | No — raw layout JSON |
| Design-layout-slice import | Full surface config | Yes — `{ "kind": "design-layout-slice", … }` |

Use scopes for surgical tree edits. Use envelopes for surface-level handoff (list presentation, forms, main page, etc.).

---

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| Component kind not allowed on surface | Wrong `designSurface` for the JSON content | Match surface to component kinds |
| Expected a component row | `insertable-row` JSON missing `"type": "component"` | Wrap in a component row node |
| Invalid field path | Form path on display surface (or vice versa) | Use `fieldPath` on forms; `primary.path` on display |
| Invalid JSON in templateJson | Malformed paste | Validate JSON before import |

See [Validation errors](../appendix/validation-errors.md) for the full troubleshooting guide.

---

## Related

- [Entity UI overrides](./entity-ui-overrides.md) — where layouts persist
- [Design surfaces matrix](../04-surfaces-and-pages/design-surfaces-matrix.md) — surface → allowed kinds
- [Tenant presets](../06-presets/tenant-presets.md) — saved templates by scope kind
- [Envelope examples](../appendix/envelope-examples.md) — surface-level import
