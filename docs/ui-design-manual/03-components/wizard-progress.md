# Component: wizard-progress

## Purpose

**When to use:** Step indicator for multi-step wizard forms.

**When not to use:** Plain forms — no wizard chrome needed. Progress for long lists — not applicable.

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
| `formModalFooter` | Yes |
| `metricStrip` | No |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | No |
| `dashboardLayout` | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `variant` | `steps` \| `bar` \| `stepper` | No | Default `bar`. | Visual style. |
| `stepLabel` | `WizardStepLabelConfig` | No |  | Label typography and position. |
| `barTrackColor` | `string` | No |  | Bar variant track color. |
| `barFillColor` | `string` | No |  | Bar variant fill color. |
| `stepSpacing` | `number` | No | Stepper only. Default 16. | Connector width px. |
| `circleSize` | `number` | No | Stepper only. Default 32. | Step circle diameter. |
| `labelMaxWidth` | `number` | No | Stepper only. | Max label width px. |
| `conditionalStyles` | `ConditionalStyleRule[]` | No | Match step status values. | Color per status. |
| `styles` | `StyleRule[]` | No |  | Outer framing. |

## Interactions

Displays current wizard step state. May allow clicking completed steps (platform default).

## Binding

None — driven by wizard state (`pending`, `active`, `completed`, `invalid`).

## Minimal example

```json
{
  "kind": "wizard-progress",
  "variant": "bar"
}
```

## Realistic example

```json
{
  "kind": "wizard-progress",
  "variant": "stepper",
  "stepLabel": {
    "show": true,
    "position": "bottom",
    "bold": true,
    "fontSize": 12
  },
  "stepSpacing": 24,
  "circleSize": 36,
  "conditionalStyles": [
    {
      "matchValue": "active",
      "background": "primary"
    },
    {
      "matchValue": "completed",
      "background": "success"
    },
    {
      "matchValue": "invalid",
      "background": "danger"
    }
  ]
}
```

## Common mistakes

- Placing on `formWizardStep` — belongs on `formWizardShell` only.
- Putting form fields in the same row as wizard progress.
- Missing `conditionalStyles` for stepper variant readability.
