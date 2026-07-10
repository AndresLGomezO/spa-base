# Component: notification-bell

## Purpose

**When to use:** Show an interactive notifications bell that opens the notifications panel (same as the sidebar bell).

**When not to use:** Static decorative icons — use `icon` instead.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | Yes |
| `tableColumnCell` | Yes |
| `tableRowExpand` | Yes |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | No |
| `formEdit` | No |
| `formPlain` | No |
| `formWizardShell` | No |
| `formWizardStep` | No |
| `formModalFooter` | No |
| `metricStrip` | Yes |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | Yes |
| `dashboardLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `iconName` | `string` | No | Lucide PascalCase name. Default `Bell`. | Icon shown on the button. |
| `iconSize` | `number` | No | 12–96 px. | Icon size. |
| `showBadge` | `boolean` | No | Default true. | Unread count badge. |
| `label` | `LabelConfig` | No |  | Optional caption. |
| `styles` | `StyleRule[]` | No |  | Icon color and layout. |

## Interactions

Interactive notifications menu with preview list, mark-all-read, and link to full notifications page. Opens below the trigger on dashboard layouts.

## Binding

None — reads live notifications from the authenticated session context.

## Minimal example

```json
{
  "kind": "notification-bell"
}
```

## Realistic example

```json
{
  "kind": "notification-bell",
  "iconName": "Bell",
  "iconSize": 24,
  "showBadge": true,
  "styles": [
    { "property": "color", "value": "primary" }
  ]
}
```

## Common mistakes

- Using `icon` when you need the notifications panel — use `notification-bell`.
- Placing on form surfaces — allowed only on dashboard-related surfaces.
