# Component: wizard-step-host

## Purpose

**When to use:** Container region where the active wizard step content is rendered.

**When not to use:** Plain forms — not used. Putting static content here — step layouts inject dynamically.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | No |
| `formEdit` | No |
| `formPlain` | No |
| `formWizardShell` | Yes |
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
| `styles` | `StyleRule[]` | No |  | Host region padding and min-height. |

## Interactions

Displays the layout for the current wizard step.

## Binding

None — step content comes from per-step layouts.

## Minimal example

```json
{
  "kind": "wizard-step-host"
}
```

## Realistic example

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-progress",
      "component": {
        "kind": "wizard-progress",
        "variant": "stepper"
      }
    },
    {
      "type": "component",
      "id": "row-host",
      "component": {
        "kind": "wizard-step-host",
        "styles": [
          {
            "property": "padding",
            "value": "24"
          },
          {
            "property": "minHeight",
            "value": "200"
          }
        ]
      }
    },
    {
      "type": "component",
      "id": "row-actions",
      "component": {
        "kind": "wizard-actions"
      }
    }
  ]
}
```

## Common mistakes

- Placing on `formModalFooter` — explicitly excluded.
- Nesting `form-field` inside the host in the shell layout — fields go in step layouts.
- Omitting the host — wizard steps have nowhere to render.
