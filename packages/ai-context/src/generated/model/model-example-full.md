# Example entity — all field types

Reference entity `demoItem` showing every field type with example values.

```json
{
  "name": "demoItem",
  "label": "Demo Item",
  "displayField": "title",
  "tenantWideRead": false,
  "fields": [
    {
      "name": "title",
      "type": "string",
      "required": true,
      "ui": {
        "label": "Title",
        "filterable": true,
        "sortable": true,
        "searchable": true,
        "order": 0
      }
    },
    {
      "name": "quantity",
      "type": "number",
      "required": true,
      "numberKind": "integer",
      "ui": { "label": "Quantity", "component": "number", "filterable": true, "sortable": true, "order": 1 }
    },
    {
      "name": "unitPrice",
      "type": "number",
      "numberKind": "decimal",
      "ui": { "label": "Unit price", "displayFormat": "currency", "filterable": true, "sortable": true, "order": 2 }
    },
    {
      "name": "isActive",
      "type": "boolean",
      "required": true,
      "ui": { "label": "Active", "component": "toggle", "filterable": true, "order": 3 }
    },
    {
      "name": "publishedAt",
      "type": "date",
      "ui": { "label": "Published", "dateDisplayFormat": "datetime", "filterable": true, "sortable": true, "order": 4 }
    },
    {
      "name": "status",
      "type": "enum",
      "required": true,
      "enumValues": ["draft", "published", "archived"],
      "ui": { "label": "Status", "component": "select", "filterable": true, "sortable": true, "order": 5 }
    },
    {
      "name": "tags",
      "type": "string",
      "isArray": true,
      "ui": { "label": "Tags", "filterable": true, "searchable": true, "sortable": false, "order": 6 }
    },
    {
      "name": "categoryId",
      "type": "relation",
      "required": true,
      "relation": { "target": "category", "type": "many-to-one", "onDelete": "restrict" },
      "ui": { "label": "Category", "component": "relation", "filterable": true, "order": 7 }
    },
    {
      "name": "assigneeIds",
      "type": "relation",
      "relation": { "target": "user", "type": "many-to-many", "onDelete": "nullify" },
      "ui": { "label": "Assignees", "component": "relation", "order": 8 }
    },
    {
      "name": "coverImage",
      "type": "image",
      "maxSizeBytes": 5242880,
      "ui": { "label": "Cover", "component": "image", "order": 9 }
    },
    {
      "name": "specSheet",
      "type": "document",
      "ui": { "label": "Spec sheet", "component": "document", "order": 10 }
    },
    {
      "name": "internalNote",
      "type": "string",
      "sensitive": true,
      "ui": { "label": "Internal note", "searchable": false, "order": 11 }
    }
  ]
}
```

## Example record values (runtime)

```json
{
  "id": "rec_01abc",
  "tenantId": "tenant_1",
  "title": "Premium Widget",
  "quantity": 42,
  "unitPrice": 19.99,
  "isActive": true,
  "publishedAt": "2026-06-13T10:30:00.000Z",
  "status": "published",
  "tags": ["hardware", "premium"],
  "categoryId": "cat_01xyz",
  "assigneeIds": ["user_a", "user_b"],
  "coverImage": {
    "storagePath": "tenants/tenant_1/entity-files/demoItem/file_01.webp",
    "contentType": "image/webp",
    "fileName": "cover.webp"
  },
  "specSheet": {
    "storagePath": "tenants/tenant_1/entity-files/demoItem/file_02.pdf",
    "contentType": "application/pdf",
    "fileName": "spec.pdf"
  },
  "internalNote": "[encrypted — do not expose in AI output]",
  "createdAt": "2026-06-01T08:00:00.000Z",
  "updatedAt": "2026-06-13T10:30:00.000Z",
  "ownerId": "user_owner"
}
```
