# Field UI properties (`ui` object)

Optional per-field presentation and query behavior.

| Property | Type | Description |
|----------|------|-------------|
| label | string | Display label in forms and column headers. |
| component | string | Form component hint: `input`, `number`, `toggle`, `date`, `relation`, `select`, `image`, `document`. |
| placeholder | string | Placeholder text for form inputs. |
| order | number | Field ordering in forms/lists (non-negative integer). |
| displayFormat | number | `currency`, `plain`, or `percentage`. |
| dateDisplayFormat | date | `date`, `datetime`, or `time`. |
| filterable | boolean | Include in list/filter UI. |
| sortable | boolean | Allow sort by this field in lists. |
| searchable | boolean | Include in full-text search (typically string fields). |

**Defaults in the data-model builder:** new string fields often default to `filterable: true`, `sortable: true`, `searchable: true`.
