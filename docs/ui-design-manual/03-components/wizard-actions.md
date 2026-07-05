# Component: wizard-actions

## Purpose

**When to use:** Back, next, cancel, and submit buttons for wizard forms.

**When not to use:** Plain form submit — use `form-actions`.

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
| `nextLabel` | `string` | No |  | Override Next button text. |
| `backLabel` | `string` | No |  | Override Back button text. |
| `cancelLabel` | `string` | No |  | Override Cancel text. |
| `submitCreateLabel` | `string` | No |  | Final step create label. |
| `submitEditLabel` | `string` | No |  | Final step save label. |
| `styles` | `StyleRule[]` | No |  | Button row layout. |

## Interactions

Navigate steps, cancel wizard, or submit on final step.

## Binding

None — wired to wizard lifecycle.

## Minimal example

```json
{
  "kind": "wizard-actions"
}
```

## Realistic example

```json
{
  "kind": "wizard-actions",
  "nextLabel": "Continue",
  "backLabel": "Previous",
  "cancelLabel": "Discard",
  "submitCreateLabel": "Create account",
  "submitEditLabel": "Save changes",
  "styles": [
    {
      "property": "justifyContent",
      "value": "space-between"
    }
  ]
}
```

## Common mistakes

- Using alongside `form-actions` in the same wizard.
- Custom labels that do not fit modal width on mobile.
- Placing on `formWizardStep` — belongs on shell/footer surfaces.
