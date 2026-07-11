# App shell — Sidebar

Tenant app sidebar chrome: logo, collapse control, nav item templates, notifications, and profile.

Part of App shell (Design Layout → App shell → Sidebar tab). Persisted on tenant_sidebar_layouts.sidebarLayout. No tenant doc → hardcoded AppSidebar. System Configuration and tenant switcher are injected at runtime for admins.

## Allowed component kinds
- `image`
- `icon`
- `text`
- `user`
- `notification-bell`
- `sidebar-nav`
- `sidebar-collapse`

## Slice envelope example
```json
{
  "kind": "sidebar-nav",
  "groupItem": {
    "rows": []
  },
  "subgroupItem": {
    "rows": []
  },
  "rawItem": {
    "rows": []
  }
}
```
