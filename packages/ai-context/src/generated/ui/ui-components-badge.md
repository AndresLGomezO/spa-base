# Component: badge

Enum or status field as a badge. Supports value-based conditionalStyles.

**Properties:** primary, fallbacks?, label?, styles?, conditionalStyles?

```json
{
  "kind": "badge",
  "primary": {
    "type": "field",
    "path": "status"
  },
  "fallbacks": [
    {
      "type": "static",
      "value": "UNKNOWN"
    }
  ],
  "label": {
    "show": true,
    "text": "Account Status",
    "position": "above",
    "bold": true,
    "color": "muted"
  },
  "conditionalStyles": [
    {
      "matchValue": "ACTIVE",
      "badgeVariant": "success",
      "background": "success"
    },
    {
      "matchValue": "PENDING",
      "badgeVariant": "pending",
      "background": "warning"
    },
    {
      "matchValue": "CLOSED",
      "badgeVariant": "closed",
      "textColor": "muted"
    }
  ]
}
```
