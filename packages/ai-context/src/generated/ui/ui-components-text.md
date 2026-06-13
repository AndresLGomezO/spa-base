# Component: text

Plain text from a field or static value.

**Properties:** primary, fallbacks?, label?, styles?, conditionalStyles?

```json
{
  "kind": "text",
  "primary": {
    "type": "field",
    "path": "nickname"
  },
  "fallbacks": [
    {
      "type": "field",
      "path": "name"
    },
    {
      "type": "static",
      "value": "—"
    }
  ],
  "label": {
    "show": true,
    "text": "Display Name",
    "position": "above",
    "bold": true,
    "color": "muted",
    "align": "left"
  },
  "conditionalStyles": [
    {
      "matchValue": "high",
      "textColor": "danger"
    }
  ]
}
```
