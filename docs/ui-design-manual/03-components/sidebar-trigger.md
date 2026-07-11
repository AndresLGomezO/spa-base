# Component: sidebar-trigger

## Purpose

**When to use:** On the `headerLayout` surface, as the hamburger / open-menu control for the global app header.

**When not to use:** Sidebar collapse control — use `sidebar-collapse` on `sidebarLayout`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `headerLayout` | Yes |
| All other surfaces | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `iconName` | `string` | No | Lucide PascalCase. Default `Menu`. | Hamburger icon |
| `iconSize` | `number` | No | 12–96 px | Icon size |
| `styles` | `StyleRule[]` | No |  | Button chrome |

## Interactions

Opens the mobile sidebar sheet via `SidebarProvider.setMobileOpen(true)`.

## Example

```json
{
  "kind": "sidebar-trigger",
  "iconName": "Menu",
  "iconSize": 20
}
```
