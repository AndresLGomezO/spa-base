# Component: ai-chat

## Purpose

**When to use:** Place the grounded AI chat trigger in the tenant-customizable app footer (`footerLayout`). Opens the same popup chat panel as the former floating FAB.

**When not to use:** Full-page chat — use the `/ai/chat` route. Static decorative icons — use `icon` instead.

## Allowed surfaces

| Design surface | Allowed |
|----------------|--------|
| `listItem` | No |
| `tableColumnCell` | No |
| `tableRowExpand` | No |
| `mainPage` | No |
| `recordDetail` | No |
| `formCreate` | No |
| `formEdit` | No |
| `formPlain` | No |
| `formWizardShell` | No |
| `formWizardStep` | No |
| `formModalFooter` | No |
| `metricStrip` | No |
| `metricRow` | No |
| `metricWidget` | No |
| `dashboardSection` | No |
| `dashboardLayout` | No |
| `sidebarLayout` | No |
| `headerLayout` | No |
| `footerLayout` | Yes |

## Properties

| Name | Type | Required | Constraints | Why |
|------|------|----------|-------------|-----|
| `iconName` | `string` | No | Lucide PascalCase name. Default `Bot`. | Icon shown on the button. |
| `iconSize` | `number` | No | 12–96 px. | Icon size. |
| `busyIndicator` | `boolean` | No | Default true. | Pulse the trigger while a chat request is pending. |
| `label` | `LabelConfig` | No |  | Optional caption. |
| `styles` | `StyleRule[]` | No |  | Layout and color via the style panel. |

## Interactions

Opens an anchored popup chat panel above the trigger. Hidden without `ai.chat.run` permission and on the `/ai/chat` full-page route.

## Binding

None — uses the authenticated AI chat session context.

## Minimal example

```json
{
  "kind": "ai-chat"
}
```

## Realistic example

```json
{
  "kind": "ai-chat",
  "iconName": "Bot",
  "iconSize": 24,
  "busyIndicator": true,
  "styles": [
    { "property": "marginLeft", "value": "auto" }
  ]
}
```

## Common mistakes

- Expecting a global floating button — the trigger only appears when placed in `footerLayout`.
- Using `icon` when you need the chat panel — use `ai-chat`.
- Placing on sidebar/header — allowed only on `footerLayout`.
