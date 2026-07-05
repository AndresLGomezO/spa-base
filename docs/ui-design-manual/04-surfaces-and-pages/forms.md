# Forms

Entity forms support two presentations: **plain** (single-page) and **wizard** (multi-step). Both use the `forms` design-layout-slice envelope surface and persist under `forms` on `entity_ui_overrides`.

Named form variants (`formDesigns[]`) use the same envelope shape with an optional `formDesignId` at the envelope root.

---

## Presentation selection

| Presentation | Preset | Sets |
|--------------|--------|------|
| `plain` | `plain-form` | `presentation: "plain"` + field rows + `form-actions` |
| `wizard` | `wizard-form` | `presentation: "wizard"` + shell layout + step definitions |

Pick the preset first. Do not set `presentation` independently when applying a preset that already defines it.

---

## Shared envelope shape

```json
{
  "kind": "design-layout-slice",
  "surface": "forms",
  "version": 1,
  "data": {}
}
```

Optional envelope fields:

| Field | Description |
|-------|-------------|
| `formDesignId` | Targets a named form design variant (e.g. `"quick-create"`) |
| `modalSize` | `sm` \| `md` \| `lg` \| `xl` \| `2xl` |
| `modalSizeByBreakpoint` | Per-breakpoint modal size overrides |
| `modalChrome` | `{ "showHeader": true, "contentPadding": "default" }` |
| `modalFooterLayout` | Footer layout when actions live outside the form body |

---

## Plain form

Surface: `formPlain` (or `formCreate` / `formEdit` in the designer).

Allowed kinds: `form-field`, `entity-field-selector`, `form-section`, `form-actions`, plus display kinds (`text`, `image`, `icon`, `date`, `numeric`, `badge`).

```json
{
  "kind": "design-layout-slice",
  "surface": "forms",
  "version": 1,
  "data": {
    "presentation": "plain",
    "modalSize": "md",
    "layout": {
      "root": {
        "type": "root",
        "id": "form-root",
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
                                    "kind": "form-field",
                                    "fieldPath": "name"
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
                                    "kind": "entity-field-selector",
                                    "fieldPath": "status",
                                    "layout": "mini-cards",
                                    "cardsPerRow": 2
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
                      "id": "row-actions",
                      "component": { "kind": "form-actions" }
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
}
```

**Design notes:**

- Use `fieldPath` for form bindings — direct entity field names (`bankId`), not relation dot notation.
- Place `form-actions` as the last row inside the root container.
- Two-column field layout: grid with one container per track.

---

## Wizard form

Surface: `formWizardShell` for the shell; `formWizardStep` for each step body.

Shell kinds: `wizard-progress`, `wizard-step-host`, `wizard-actions`.
Step kinds: `form-field`, `entity-field-selector`, `form-section`, display kinds.

```json
{
  "kind": "design-layout-slice",
  "surface": "forms",
  "version": 1,
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
                        "id": "row-grid",
                        "component": {
                          "kind": "grid",
                          "gridTemplateColumns": "minmax(0, 1fr) minmax(0, 2fr)",
                          "gap": "24px",
                          "rows": [
                            {
                              "type": "component",
                              "id": "track-progress",
                              "component": {
                                "kind": "container",
                                "rows": [
                                  {
                                    "type": "component",
                                    "id": "row-progress",
                                    "component": { "kind": "wizard-progress" }
                                  }
                                ]
                              }
                            },
                            {
                              "type": "component",
                              "id": "track-content",
                              "component": {
                                "kind": "container",
                                "rows": [
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
          "id": "step-details",
          "label": "Details",
          "subtitle": "Basic information",
          "layout": {
            "root": {
              "type": "root",
              "id": "step-root",
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
                            "id": "row-name",
                            "component": {
                              "kind": "form-field",
                              "fieldPath": "name"
                            }
                          },
                          {
                            "type": "component",
                            "id": "row-amount",
                            "component": {
                              "kind": "form-field",
                              "fieldPath": "amount"
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
        },
        {
          "id": "step-review",
          "label": "Review",
          "layout": {
            "root": {
              "type": "root",
              "id": "step-review-root",
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
                              "title": "Review your information"
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

**Design notes:**

- The shell grid places progress in a narrow left track and step host + actions in a wider right track.
- Each step requires a unique `id`, a `label`, and a step `layout` document.
- When actions move to `modalFooterLayout`, the shell may omit `wizard-actions` (surface: `formModalFooter`).

---

## Named form designs

Target a specific variant by adding `formDesignId` to the envelope:

```json
{
  "kind": "design-layout-slice",
  "surface": "forms",
  "version": 1,
  "formDesignId": "register-payment",
  "data": {
    "presentation": "plain",
    "modalSize": "lg",
    "layout": {
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
                      "id": "row-name",
                      "component": { "kind": "form-field", "fieldPath": "name" }
                    },
                    {
                      "type": "component",
                      "id": "row-actions",
                      "component": { "kind": "form-actions" }
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
}
```

Entity page create/edit buttons reference form designs through `entityPageCreateFormDesignId` and `entityPageEditFormDesignId`.

---

## Form checklist

- [ ] `presentation` matches the intended UX (plain vs wizard)
- [ ] Plain forms end with `form-actions` inside the root container
- [ ] Wizard shell contains `wizard-progress`, `wizard-step-host`, and `wizard-actions`
- [ ] Each wizard step has a unique `id` and complete step layout
- [ ] `fieldPath` values are direct entity fields, not relation labels
- [ ] Modal size is appropriate for field count and layout width

---

## Related

- [Form field paths](../02-data-binding/form-field-paths.md) — `fieldPath` conventions
- [Design surfaces matrix](./design-surfaces-matrix.md) — form surfaces
- [Platform presets](../06-presets/platform-presets.md) — `plain-form`, `wizard-form`
- [Entity UI overrides](../05-persistence/entity-ui-overrides.md) — `forms`, `formDesigns`
