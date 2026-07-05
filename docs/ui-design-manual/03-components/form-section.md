# Component: form-section

## Purpose

**When to use:** Visual section divider with optional title in forms.

**When not to use:** Page-level regions — use layout structure. Wizard step titles — wizard config handles steps.

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
| `formWizardStep` | Yes |
| `formModalFooter` | Yes |
| `metricStrip` | No |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | No |
| `dashboardLayout` | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `title` | `string` | No |  | Section heading text. |
| `styles` | `StyleRule[]` | No |  | Section spacing and borders. |

## Interactions

Non-interactive visual grouping.

## Binding

None.

## Minimal example

```json
{
  "kind": "form-section",
  "title": "Details"
}
```

## Realistic example

```json
{
  "kind": "container",
  "rows": [
    {
      "type": "component",
      "id": "row-section",
      "component": {
        "kind": "form-section",
        "title": "Account details"
      }
    },
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
      "id": "row-bank",
      "component": {
        "kind": "form-field",
        "fieldPath": "bankId"
      }
    }
  ]
}
```

## Common mistakes

- Expecting automatic field grouping — fields must still be sibling rows.
- Using on non-form surfaces.
- Nesting fields inside `form-section` config — sections are not row holders.
