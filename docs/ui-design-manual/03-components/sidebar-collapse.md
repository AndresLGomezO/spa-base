# Component: sidebar-collapse

## Purpose

**When to use:** On the `sidebarLayout` surface, as the collapse/expand control in the sidebar header.

**When not to use:** Generic icons elsewhere — use `icon`. Mobile hamburger uses the app header `SidebarTrigger`, not this component.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `sidebarLayout` | Yes |
| All other surfaces | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `iconName` | `string` | No | Lucide PascalCase. Default `PanelLeftClose`. | Icon when expanded |
| `expandIconName` | `string` | No | Lucide PascalCase. Default `PanelLeft`. | Icon when collapsed |
| `iconSize` | `number` | No | 12–96 px | Icon size |
| `styles` | `StyleRule[]` | No |  | Button chrome |
| `conditionalStyles` | `ConditionalStyleRule[]` | No |  | Optional conditional chrome |

## Interactions

- Toggles desktop sidebar icon mode via `SidebarProvider`.
- Hidden on the mobile sheet (collapse is not shown there).

## Example

```json
{
  "kind": "sidebar-collapse",
  "iconName": "PanelLeftClose",
  "expandIconName": "PanelLeft",
  "iconSize": 16
}
```
