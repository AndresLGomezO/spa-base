# Entity definition schema (create / patch)

Persisted per tenant in `entity_definitions`. Use **camelCase** for `name` and field names.

## Top-level properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string | yes | Entity identifier. Pattern: `^[a-z][a-zA-Z0-9]*$` (e.g. `invoice`, `bankAccount`). |
| label | string | yes | Human-readable entity name (e.g. `Invoice`). |
| description | string | no | Optional summary of what this entity represents and how it is used. |
| fields | FieldDefinition[] | yes | At least one user-defined field. |
| displayField | string | no | Field used as record title in lists/relations. Cannot be an array field. |
| tenantWideRead | boolean | no | When true, all tenant users with read permission can list records without ownership filter. |
| inMemoryListQueries | boolean | no | When true, list filters/sort run in memory (small collections only). |
| hiddenFromNav | boolean | no | Hide entity from sidebar navigation. |
| navCategoryId | string | no | Entity category id for nav grouping. |
| navOrder | number | no | Sort order within nav category. |
| ui | EntityUIConfig | no | UI overrides (forms, views). Usually configured separately after model creation. |

## System fields (auto-injected — do NOT define)

Every entity record automatically includes: `id`, `tenantId`, `createdAt`, `updatedAt`, `ownerId`, `accessUserIds`, `sharedWith`.

## Minimal create example

```json
{
  "name": "product",
  "label": "Product",
  "description": "Sellable items in the catalog",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "required": true,
      "ui": { "label": "Name", "filterable": true, "sortable": true, "searchable": true }
    }
  ],
  "displayField": "name"
}
```
