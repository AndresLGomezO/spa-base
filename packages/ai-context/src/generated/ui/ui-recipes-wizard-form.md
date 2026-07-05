# Wizard form with one step

## Goal

Create a **multi-step wizard form** with a standard shell (progress, step host, actions) and at least one step containing editable fields in a grid layout.

## When to use

- Flows that benefit from guided steps (onboarding, create-with-review, complex data entry).
- Modal or page forms where `presentation: "wizard"` is set via the `wizard-form` preset.

## Step-by-step

1. **Set presentation** — `presentation: "wizard"` and choose `modalSize` (`"md"` or `"lg"` for multi-field steps).
2. **Build the shell layout** — under `wizard.shellLayout`, use column `root` → single `container` with three rows in order:
   - `wizard-progress`
   - `wizard-step-host`
   - `wizard-actions`
3. **Define steps** — add entries to `wizard.steps[]`. Each step needs a unique `id`, human `label`, and its own `layout` document.
4. **Lay out step content** — each step uses column `root` → `container`. For side-by-side fields, nest a `grid` with `gridTemplateColumns: "1fr 1fr"` inside the container.
5. **Bind fields** — use `form-field` with top-level `fieldPath` values (`name`, `email`, `bankId`). No dot notation on form paths.
6. **Keep wizard components in the shell only** — do not place `wizard-progress`, `wizard-step-host`, or `wizard-actions` inside step layouts.
7. **Add more steps later** — duplicate the step object pattern; the progress component reads `wizard.steps` automatically.

## Layout sketch

```
wizard.shellLayout.root
└── container
    ├── wizard-progress
    ├── wizard-step-host   ← active step layout injected here
    └── wizard-actions

wizard.steps[0].layout.root
└── container
    └── grid (1fr | 1fr)
        ├── track-left → container → form-field (name)
        └── track-right → container → form-field (email)
```

## Full envelope example

```json
{
  "kind": "design-layout-slice",
  "surface": "forms",
  "version": 1,
  "formDesignId": "account-onboarding",
  "data": {
    "presentation": "wizard",
    "modalSize": "lg",
    "wizard": {
      "shellLayout": {
        "root": {
          "type": "root",
          "id": "wizard-shell-root",
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
                        "id": "row-progress",
                        "component": { "kind": "wizard-progress" }
                      },
                      {
                        "type": "component",
                        "id": "row-host",
                        "component": { "kind": "wizard-step-host" }
                      },
                      {
                        "type": "component",
                        "id": "row-actions",
                        "component": { "kind": "wizard-actions" }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      },
      "steps": [
        {
          "id": "step-account-details",
          "label": "Account details",
          "layout": {
            "root": {
              "type": "root",
              "id": "step-details-root",
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
                            "id": "row-section",
                            "component": {
                              "kind": "form-section",
                              "title": "Basic information"
                            }
                          },
                          {
                            "type": "component",
                            "id": "row-grid",
                            "component": {
                              "kind": "grid",
                              "gridTemplateColumns": "1fr 1fr",
                              "gap": "16px",
                              "alignItems": "start",
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
                                          "kind": "form-field",
                                          "fieldPath": "name"
                                        }
                                      },
                                      {
                                        "type": "component",
                                        "id": "row-email",
                                        "component": {
                                          "kind": "form-field",
                                          "fieldPath": "email"
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
                                        "id": "row-phone",
                                        "component": {
                                          "kind": "form-field",
                                          "fieldPath": "phone"
                                        }
                                      },
                                      {
                                        "type": "component",
                                        "id": "row-bank",
                                        "component": {
                                          "kind": "entity-field-selector",
                                          "fieldPath": "bankId",
                                          "layout": "list"
                                        }
                                      }
                                    ]
                                  }
                                }
                              ]
                            }
                          },
                          {
                            "type": "component",
                            "id": "row-notes",
                            "component": {
                              "kind": "form-field",
                              "fieldPath": "notes",
                              "multiline": true,
                              "multilineRows": 4
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
        }
      ]
    }
  }
}
```

## Checklist

- [ ] `presentation` is `"wizard"` and `wizard` object is present
- [ ] Shell contains `wizard-progress`, `wizard-step-host`, and `wizard-actions` in that order
- [ ] Each step has a unique `id`, `label`, and complete `layout` with root container
- [ ] Step fields use `form-field` / `entity-field-selector` — not display kinds
- [ ] `fieldPath` values are top-level entity fields (e.g. `bankId`, not `bank.name`)
- [ ] Multi-column field groups use `grid`, not multiple root columns

## Related

- [Form field paths](../02-data-binding/form-field-paths.md) — `fieldPath` rules and two-column grid
- [Container and grid tracks](../01-layout-tree/container-and-tracks.md) — grid track composition
- [Envelope examples](../appendix/envelope-examples.md) — wizard variant under `forms`

**Surfaces:** `forms`