# Component: numeric

Number field with currency/percentage formatting.

**Properties:** primary, fallbacks?, displayFormat?: currency | plain | percentage, showCurrency?, showToneColors?, label?, styles?, conditionalStyles?

```json
{
  "kind": "numeric",
  "primary": {
    "type": "field",
    "path": "amount"
  },
  "displayFormat": "currency",
  "label": {
    "show": true,
    "text": "Balance",
    "position": "above",
    "align": "right"
  }
}
```
