# Component: view-date-filter

Date period filter for a dashboard data view. Binds to a configurable URL param (default `year`, `month`, or `date`). First instance in layout walk order wins for URL param configuration.

**Properties:** dateFilterGranularity?, dateFilterParam?, label?, styles?

```json
{
  "kind": "view-date-filter",
  "dateFilterGranularity": "month",
  "dateFilterParam": "month",
  "label": {
    "show": true,
    "text": "Reporting period",
    "position": "above"
  }
}
```
