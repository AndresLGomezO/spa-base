# Component: view-filter

Unified search and filter toolbar for a view. Toggle search, entity filters, and/or a date filter in the designer. Search binds to URL `q`; filters bind to URL `f.{entity}.{field}`; date filter binds to a configurable URL param (default `year`, `month`, or `date`).

**Properties:** enableSearch?, enableFilters?, enableDateFilter?, dateFilterGranularity?, dateFilterParam?, dateFilterLabel?, searchPlaceholder?, filters, styles?

```json
{
  "kind": "view-filter",
  "enableSearch": true,
  "enableFilters": true,
  "enableDateFilter": true,
  "dateFilterGranularity": "month",
  "dateFilterParam": "month",
  "dateFilterLabel": {
    "show": true,
    "text": "Reporting period",
    "position": "above"
  },
  "searchPlaceholder": "Search…",
  "filters": [
    {
      "entityName": "account",
      "fieldName": "accountType"
    }
  ]
}
```
