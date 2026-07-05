# Component: text

## Purpose

**When to use:** Display a string from an entity field or static value.

**When not to use:** Editable input — use `form-field`. Aggregated KPIs — use metric components.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | No |
| `recordDetail` | Yes |
| `formCreate` | Yes |
| `formEdit` | Yes |
| `formPlain` | Yes |
| `formWizardShell` | Yes |
| `formWizardStep` | Yes |
| `formModalFooter` | Yes |
| `metricStrip` | Yes |
| `metricRow` | Yes |
| `metricWidget` | Yes |
| `dashboardSection` | Yes |
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `primary` | `DataSource` | Yes | `field` or `static`. | Main value source. |
| `fallbacks` | `DataSource[]` | No | Resolved in order after `primary`. | Alternate fields or placeholders. |
| `label` | `LabelConfig` | No | See label-config reference. | Optional caption. |
| `styles` | `StyleRule[]` | No | Valid style properties. | Typography and spacing. |
| `conditionalStyles` | `ConditionalStyleRule[]` | No | Match on rendered string value. | Value-based styling. |

## Interactions

Read-only display.

## Binding

Uses `primary` / `fallbacks` DataSource (`field.path` for display paths like `bank.name`). Not `fieldPath`.

## Minimal example

```json
{
  "kind": "text",
  "primary": {
    "type": "field",
    "path": "name"
  }
}
```

## Realistic example

```json
{
  "kind": "text",
  "primary": {
    "type": "field",
    "path": "nickname"
  },
  "fallbacks": [
    {
      "type": "field",
      "path": "name"
    },
    {
      "type": "static",
      "value": "—"
    }
  ],
  "label": {
    "show": true,
    "text": "Display name",
    "position": "above",
    "bold": true
  },
  "conditionalStyles": [
    {
      "matchValue": "VIP",
      "textColor": "primary"
    }
  ]
}
```

## Common mistakes

- Using FK paths (`bankId`) instead of display paths (`bank.name`) on list/detail surfaces.
- Using `fieldPath` — that is for `form-field` only.
- Omitting a static fallback when empty values should show a placeholder.
