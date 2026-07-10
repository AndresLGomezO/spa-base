# Component: view-filters

Entity field filter panel for a data view. Filter entries bind to URL `f.{entity}.{field}`. Multiple instances merge filter columns globally.

**Properties:** filters, label?, styles?

```json
{
  "kind": "view-filters",
  "filters": [
    {
      "entityName": "account",
      "fieldName": "accountType"
    }
  ]
}
```
