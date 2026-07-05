# Component: form-actions

## Purpose

**When to use:** Submit and cancel buttons for plain (non-wizard) forms.

**When not to use:** Wizard navigation — use `wizard-actions`. Toolbar actions — platform-provided on main page.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | Yes |
| `formEdit` | Yes |
| `formPlain` | Yes |
| `formWizardShell` | No |
| `formWizardStep` | No |
| `formModalFooter` | No |
| `metricStrip` | No |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | No |
| `dashboardLayout` | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `styles` | `StyleRule[]` | No |  | Button row alignment and spacing. |

## Interactions

Submit validates and saves; cancel dismisses the form.

## Binding

None — wired to form lifecycle by the platform.

## Minimal example

```json
{
  "kind": "form-actions"
}
```

## Realistic example

```json
{
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
            "id": "track-fields",
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
            "id": "track-spacer",
            "component": {
              "kind": "container",
              "rows": []
            }
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "row-actions",
      "component": {
        "kind": "form-actions",
        "styles": [
          {
            "property": "marginTop",
            "value": "24"
          },
          {
            "property": "justifyContent",
            "value": "flex-end"
          }
        ]
      }
    }
  ]
}
```

## Common mistakes

- Placing on `formModalFooter` — excluded from that surface.
- Multiple `form-actions` rows in one form.
- Using on wizard shell — use `wizard-actions`.
