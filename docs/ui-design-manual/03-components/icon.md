# Component: icon

## Purpose

**When to use:** Decorative Lucide icon with optional label.

**When not to use:** Entity image content — use `image`. Status badges — use `badge`.

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
| `iconName` | `string` | Yes | Valid Lucide icon name (PascalCase). | Which icon to render. |
| `iconSize` | `number` | No | Pixels. | Icon dimensions. |
| `label` | `LabelConfig` | No |  | Caption below/above icon. |
| `styles` | `StyleRule[]` | No |  | Color via style rules. |

## Interactions

Read-only display.

## Binding

None — icon name is static config. Does not use DataSource.

## Minimal example

```json
{
  "kind": "icon",
  "iconName": "Building2"
}
```

## Realistic example

```json
{
  "kind": "icon",
  "iconName": "Landmark",
  "iconSize": 20,
  "label": {
    "show": true,
    "text": "Institution",
    "position": "below",
    "color": "muted"
  },
  "styles": [
    {
      "property": "color",
      "value": "primary"
    }
  ]
}
```

## Common mistakes

- Invalid or misspelled Lucide `iconName`.
- Expecting `primary` DataSource — `icon` has no field binding.
- Using icon for enum status — `badge` with `conditionalStyles` is clearer.
