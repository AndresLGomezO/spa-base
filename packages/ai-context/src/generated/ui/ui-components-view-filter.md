# Component: view-filter

Unified search and filter toolbar for a view. Toggle search and/or filters in the designer. Search binds to URL `q`; filters bind to URL `f.{entity}.{field}`.

**Properties:** enableSearch?, enableFilters?, searchPlaceholder?, filters, styles?

```json
{
  "kind": "view-filter",
  "enableSearch": true,
  "enableFilters": true,
  "searchPlaceholder": "Search…",
  "filters": [
    {
      "entityName": "account",
      "fieldName": "accountType"
    }
  ]
}
```
