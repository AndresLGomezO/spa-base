# App shell — Footer

Global bottom navigation tabs. Independent of the sidebar layout.

Part of App shell → Footer tab. Use nav-tab components for icon+label route links. Empty footer → not rendered at runtime.

## Allowed component kinds
- `image`
- `icon`
- `text`
- `user`
- `nav-tab`

## Slice envelope example
```json
{
  "kind": "nav-tab",
  "iconName": "Home",
  "label": "Home",
  "to": "/"
}
```
