# Component: sidebar-nav

## Purpose

**When to use:** On the `sidebarLayout` surface, as the navigation items region. Holds shared templates for group, subgroup, and raw nav items so styling one template applies to every matching item at runtime.

**When not to use:** Entity list cards or query result lists — use `query-viewer` or list item layouts instead.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `sidebarLayout` | Yes |
| All other surfaces | No |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `groupItem` | `{ rows, styles?, motion? }` | Yes | Shared template for top-level nav groups | One template styles all groups |
| `subgroupItem` | `{ rows, styles?, motion? }` | Yes | Shared template for nested subgroups | One template styles all subgroups |
| `rawItem` | `{ rows, styles?, motion? }` | Yes | Shared template for leaf links | One template styles all links |
| `styles` | `StyleRule[]` | No |  | Nav container chrome |
| `conditionalStyles` | `ConditionalStyleRule[]` | No |  | Optional conditional chrome |

## Interactions

- Designer preview clones templates for sample nav items (excludes System Configuration).
- Runtime clones templates for permission-built nav items (includes System Configuration for admins).
- Hover/focus in the designer matches by stable template row ids so all instances of the same template highlight together.
- Tenant switcher is never part of this component — injected at runtime for super-admins.

## Example

```json
{
  "kind": "sidebar-nav",
  "groupItem": {
    "rows": [
      {
        "type": "component",
        "id": "group-icon",
        "component": { "kind": "icon", "iconName": "Folder", "iconSize": 16 }
      }
    ]
  },
  "subgroupItem": { "rows": [] },
  "rawItem": {
    "rows": [
      {
        "type": "component",
        "id": "raw-icon",
        "component": { "kind": "icon", "iconName": "File", "iconSize": 16 }
      }
    ]
  }
}
```
