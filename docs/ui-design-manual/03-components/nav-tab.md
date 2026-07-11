# Component: nav-tab

## Purpose

**When to use:** On the `footerLayout` surface, as a bottom navigation tab (icon + label linking to a route).

**When not to use:** Sidebar nav items — use `sidebar-nav` templates on `sidebarLayout`.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `footerLayout` | Yes |
| All other surfaces | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `iconName` | `string` | Yes | Lucide PascalCase | Tab icon |
| `label` | `string` | No |  | Tab caption |
| `to` | `string` | Yes | App path | Navigation target |
| `matchPath` | `string` | No |  | Active-state match prefix |
| `styles` | `StyleRule[]` | No |  | Tab chrome |

## Example

```json
{
  "kind": "nav-tab",
  "iconName": "Home",
  "label": "Home",
  "to": "/",
  "matchPath": "/"
}
```
