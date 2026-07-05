# Tenant presets

Tenant presets are custom layout and component templates saved per tenant in the **`ui_builder_presets`** collection. They complement the six platform built-ins and are managed in **Settings → Design layout → Presets**.

---

## Storage model

Each preset document contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document identifier |
| `name` | string | Display name (required) |
| `description` | string | Optional summary |
| `kind` | enum | Template granularity (see below) |
| `presetCategory` | enum | `layout-preset` or `component-template` |
| `designSurface` | `DesignSurface` | Target surface for validation (optional but recommended) |
| `sourceEntityName` | string | Entity the preset was created from (optional) |
| `templateJson` | string | Serialized layout fragment |
| `fieldSlots` | `FieldSlot[]` | Parameterized field bindings (component templates only) |
| `updatedAt` | ISO datetime | Last modification |

### Firestore encoding

On write, `fieldSlots` serializes to `fieldSlotsJson`. `templateJson` is stored as a string.

---

## Preset kinds

| Kind | `templateJson` shape | Import scope equivalent |
|------|----------------------|-------------------------|
| `layout-document` | `UiLayoutDocument` | `layout-document` |
| `column` | `ColumnNode` | `column` |
| `component-row` | `ComponentRowNode` | `component-row` |
| `grid-track` | `ComponentRowNode` | Grid track row (internal) |

### Categories

| Category | `fieldSlots` | Use |
|----------|--------------|-----|
| `layout-preset` | Must be empty `[]` | Full or partial layout fragments |
| `component-template` | One or more slots | Reusable rows with parameterized field paths |

---

## Supported design surfaces

When creating a preset, select the surface the template targets. This drives component-kind validation on insert.

`listItem`, `tableColumnCell`, `tableRowExpand`, `mainPage`, `recordDetail`, `formCreate`, `formEdit`, `formPlain`, `formWizardShell`, `formWizardStep`, `formModalFooter`, `metricStrip`, `metricRow`, `metricWidget`, `dashboardSection`, `dashboardLayout`

---

## Creating a preset

### Layout preset (full document)

1. Open **Settings → Design layout → Presets**.
2. Click **Create preset**.
3. Set **Kind** to `layout-document`.
4. Select the **Design surface** (e.g. `listItem`).
5. Paste or edit `templateJson` — must be a valid `UiLayoutDocument`.
6. Leave **Field slots** empty.
7. Save.

Example `templateJson` for a list item card track:

```json
{
  "root": {
    "type": "root",
    "id": "preset-root",
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
                    "gridTemplateColumns": "minmax(0, 2fr) minmax(0, 1fr)",
                    "gap": "12px",
                    "rows": [
                      {
                        "type": "component",
                        "id": "track-primary",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-title",
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
                        "id": "track-status",
                        "component": {
                          "kind": "container",
                          "rows": [
                            {
                              "type": "component",
                              "id": "row-badge",
                              "component": {
                                "kind": "badge",
                                "primary": { "type": "field", "path": "status" }
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
          }
        ]
      }
    ]
  }
}
```

### Component-row preset

1. Set **Kind** to `component-row`.
2. Select the design surface.
3. Paste a single component row as `templateJson`.
4. Define **Field slots** when paths should be parameterized at insert time.

Example `templateJson`:

```json
{
  "type": "component",
  "id": "row-kpi",
  "component": {
    "kind": "metric-kpi",
    "metricDefinitionId": "total_revenue",
    "label": "Revenue",
    "groupBindings": {},
    "dimensionBindings": {
      "accountId": { "type": "entityField", "fieldPath": "id" }
    }
  }
}
```

### Field slots

Component templates declare parameterized bindings:

```json
[
  {
    "id": "primary-field",
    "kind": "dataSourceField",
    "label": "Primary field",
    "jsonPath": "component.primary.path"
  }
]
```

| Slot kind | Binds to |
|-----------|----------|
| `dataSourceField` | Display `primary.path` on text, badge, date, etc. |
| `formFieldPath` | `fieldPath` on `form-field` or `entity-field-selector` |

Layout presets (`layout-preset` category) must not include field slots.

---

## Using presets in designers

Presets appear in the **Insert preset** dialog within entity designers. The catalog filters by:

- Current `designSurface`
- Preset `kind` matching the insertion context
- Built-in templates (platform) alongside tenant presets

On insert:

1. `templateJson` is parsed and validated against the active surface.
2. Field slots prompt for path values (component templates).
3. Layout IDs are regenerated to avoid collisions.
4. The fragment merges at the insertion point.

---

## Editing and deleting

- **Edit** — Update name, description, surface, or `templateJson` in the preset detail panel.
- **Delete** — Removes the document from `ui_builder_presets`. Existing entity layouts that already applied the preset are unaffected.

---

## Tenant bundle export

`ui_builder_presets` is included in tenant bundle import/export alongside `entity_ui_overrides`. Presets migrate with the tenant configuration.

---

## Preset vs platform preset

| | Platform built-in | Tenant preset |
|--|-------------------|---------------|
| Storage | Code registry | `ui_builder_presets` |
| Count | 6 fixed templates | Unlimited per tenant |
| Field slots | No | Yes (component templates) |
| Presentation metadata | Sets `listViewType` / `presentation` | Layout only |
| Managed in | Designer preset picker | Settings → Presets |

---

## Related

- [Platform presets](./platform-presets.md) — six built-in templates
- [Import scopes](../05-persistence/import-scopes.md) — scope shapes matching preset kinds
- [Design surfaces matrix](../04-surfaces-and-pages/design-surfaces-matrix.md) — surface selection
- [Entity UI overrides](../05-persistence/entity-ui-overrides.md) — entity layout persistence
