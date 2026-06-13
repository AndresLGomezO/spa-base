# Component: date

Date/datetime field with optional format.

**Properties:** primary, fallbacks?, dateDisplayFormat?: date | datetime | time, label?, styles?, conditionalStyles?

```json
{
  "kind": "date",
  "primary": {
    "type": "field",
    "path": "createdAt"
  },
  "fallbacks": [
    {
      "type": "static",
      "value": "N/A"
    }
  ],
  "dateDisplayFormat": "datetime",
  "label": {
    "show": true,
    "position": "above"
  }
}
```
