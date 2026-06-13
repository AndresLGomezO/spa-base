# Component: wizard-progress

Wizard step indicator. Supports conditionalStyles for step status values.

**Properties:** variant?: steps | bar | stepper, stepLabel?, stepSpacing?, circleSize?, labelMaxWidth?, barTrackColor?, barFillColor?, conditionalStyles?, styles?

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
  "conditionalStyles": [
    {
      "matchValue": "active",
      "background": "primary"
    },
    {
      "matchValue": "completed",
      "background": "success"
    }
  ]
}
```
