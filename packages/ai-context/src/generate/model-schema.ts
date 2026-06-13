/**
 * Static AI context for dynamic entity / data-model creation.
 * Source of truth: packages/dynamic-entities/src/types.ts
 */

export const MODEL_ENTITY_SCHEMA_ATOM_ID = "model.entity.schema";

export function buildModelEntitySchemaAtom(): string {
  return `# Entity definition schema (create / patch)

Persisted per tenant in \`entity_definitions\`. Use **camelCase** for \`name\` and field names.

## Top-level properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string | yes | Entity identifier. Pattern: \`^[a-z][a-zA-Z0-9]*$\` (e.g. \`invoice\`, \`bankAccount\`). |
| label | string | yes | Human-readable entity name (e.g. \`Invoice\`). |
| fields | FieldDefinition[] | yes | At least one user-defined field. |
| displayField | string | no | Field used as record title in lists/relations. Cannot be an array field. |
| tenantWideRead | boolean | no | When true, all tenant users with read permission can list records without ownership filter. |
| inMemoryListQueries | boolean | no | When true, list filters/sort run in memory (small collections only). |
| hiddenFromNav | boolean | no | Hide entity from sidebar navigation. |
| navCategoryId | string | no | Entity category id for nav grouping. |
| navOrder | number | no | Sort order within nav category. |
| ui | EntityUIConfig | no | UI overrides (forms, views). Usually configured separately after model creation. |

## System fields (auto-injected — do NOT define)

Every entity record automatically includes: \`id\`, \`tenantId\`, \`createdAt\`, \`updatedAt\`, \`ownerId\`, \`accessUserIds\`, \`sharedWith\`.

## Minimal create example

\`\`\`json
{
  "name": "product",
  "label": "Product",
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
\`\`\`
`;
}

export const MODEL_FIELD_TYPES_ATOM_ID = "model.field.types";

export function buildModelFieldTypesAtom(): string {
  return `# Field types (closed set)

| type | Stored value | Notes |
|------|--------------|-------|
| string | string | Text; supports \`isArray\`. |
| number | number | Use \`numberKind\`: \`integer\` or \`decimal\`; supports \`isArray\`. |
| boolean | boolean | true/false; supports \`isArray\`. |
| date | string (ISO 8601) | e.g. \`"2026-06-13T12:00:00.000Z"\`; supports \`isArray\`. |
| enum | string | Must be one of \`enumValues\`; supports \`isArray\`. |
| relation | string (id) or string[] | Requires \`relation\` config; **cannot** be sensitive or array. |
| image | EntityFileReference | JPEG/PNG/WebP; max size via \`maxSizeBytes\`. |
| document | EntityFileReference | PDF only; max size via \`maxSizeBytes\`. |

**Array eligibility:** only \`string\`, \`number\`, \`boolean\`, \`date\`, \`enum\` may set \`isArray: true\`.
`;
}

export const MODEL_FIELD_PROPERTIES_ATOM_ID = "model.field.properties";

export function buildModelFieldPropertiesAtom(): string {
  return `# Field properties

## Core (all types)

| Property | Type | Description |
|----------|------|-------------|
| name | string | camelCase field name (e.g. \`bankId\`, \`totalAmount\`). |
| type | FieldType | One of the closed field types. |
| required | boolean | When true, value must be present on create. Default: optional. |
| sensitive | boolean | Encrypted at rest; omit from AI display contexts. **Not allowed** on relation, image, or document fields. |
| isArray | boolean | Store multiple values. Only for string/number/boolean/date/enum. |
| ui | FieldUi | Presentation and list-query flags (see \`model.field.ui\`). |

## Type-specific

| Property | Applies to | Description |
|----------|------------|-------------|
| enumValues | enum | Non-empty string array of allowed values. Required for enum fields. |
| numberKind | number | \`integer\` or \`decimal\`. Optional; defaults to decimal behavior. |
| relation | relation | \`{ target, type, onDelete? }\`. Required for relation fields. |
| maxSizeBytes | image, document | Max upload size in bytes (cap: 52428800). Defaults: image 5MB, document 10MB. |
| defaultImage | image | Default \`EntityFileReference\` when no upload provided. |
`;
}

export const MODEL_FIELD_UI_ATOM_ID = "model.field.ui";

export function buildModelFieldUiAtom(): string {
  return `# Field UI properties (\`ui\` object)

Optional per-field presentation and query behavior.

| Property | Type | Description |
|----------|------|-------------|
| label | string | Display label in forms and column headers. |
| component | string | Form component hint: \`input\`, \`number\`, \`toggle\`, \`date\`, \`relation\`, \`select\`, \`image\`, \`document\`. |
| placeholder | string | Placeholder text for form inputs. |
| order | number | Field ordering in forms/lists (non-negative integer). |
| displayFormat | number | \`currency\`, \`plain\`, or \`percentage\`. |
| dateDisplayFormat | date | \`date\`, \`datetime\`, or \`time\`. |
| filterable | boolean | Include in list/filter UI. |
| sortable | boolean | Allow sort by this field in lists. |
| searchable | boolean | Include in full-text search (typically string fields). |

**Defaults in the data-model builder:** new string fields often default to \`filterable: true\`, \`sortable: true\`, \`searchable: true\`.
`;
}

export const MODEL_RELATIONS_ATOM_ID = "model.field.relations";

export function buildModelRelationsAtom(): string {
  return `# Relation fields

## Relation config shape

\`\`\`json
{
  "target": "bank",
  "type": "many-to-one",
  "onDelete": "restrict"
}
\`\`\`

| Property | Values | Description |
|----------|--------|-------------|
| target | entity name | Target entity \`name\` (camelCase). |
| type | see below | Cardinality and storage strategy. |
| onDelete | restrict, cascade, nullify | Optional. Default: \`restrict\`. |

## Relation types

| type | Storage | Field naming | Example |
|------|---------|--------------|---------|
| many-to-one | FK on **this** entity (\`targetId\`) | \`{target}Id\` e.g. \`bankId\` | Invoice → Bank |
| one-to-one | FK on **this** entity | \`{target}Id\` | User → Profile |
| one-to-many | FK on **target** entity (no storage here) | plural target e.g. \`transactions\` | Account → Transactions |
| many-to-many | Join collection \`{source}_{target}\` | plural target e.g. \`tags\` | Article ↔ Tags |

## Rules

- Relation fields store **record id(s)**, not embedded objects.
- \`many-to-one\` / \`one-to-one\`: value is a single id string.
- \`many-to-many\`: value is an array of id strings.
- \`one-to-many\`: defined on the **parent** side; child holds the FK.
- Cannot mark relation fields as \`sensitive\` or \`isArray\` (many-to-many uses array values implicitly via join).
`;
}

export const MODEL_FILES_ATOM_ID = "model.field.files";

export function buildModelFilesAtom(): string {
  return `# Image and document fields

## EntityFileReference shape

\`\`\`json
{
  "storagePath": "tenants/{tenantId}/entity-files/{entityName}/{fileId}.webp",
  "contentType": "image/webp",
  "fileName": "logo.webp"
}
\`\`\`

| Property | Description |
|----------|-------------|
| storagePath | Server-managed GCS path. Set by upload API, not hand-authored on create. |
| contentType | **image:** \`image/jpeg\`, \`image/png\`, \`image/webp\`. **document:** \`application/pdf\`. |
| fileName | Original file name for download display. |

## Limits

- Default max: image **5MB**, document **10MB**.
- Override with \`maxSizeBytes\` (max cap **50MB**).
- Image fields may include \`defaultImage\` (same reference shape).
- File fields cannot be \`sensitive\`.
`;
}

export const MODEL_EXAMPLE_FULL_ATOM_ID = "model.example.full";

export function buildModelFullExampleAtom(): string {
  return `# Example entity — all field types

Reference entity \`demoItem\` showing every field type with example values.

\`\`\`json
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
\`\`\`

## Example record values (runtime)

\`\`\`json
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
\`\`\`
`;
}

export const MODEL_FRAGMENT_SPECS = [
  { id: MODEL_ENTITY_SCHEMA_ATOM_ID, build: buildModelEntitySchemaAtom },
  { id: MODEL_FIELD_TYPES_ATOM_ID, build: buildModelFieldTypesAtom },
  { id: MODEL_FIELD_PROPERTIES_ATOM_ID, build: buildModelFieldPropertiesAtom },
  { id: MODEL_FIELD_UI_ATOM_ID, build: buildModelFieldUiAtom },
  { id: MODEL_RELATIONS_ATOM_ID, build: buildModelRelationsAtom },
  { id: MODEL_FILES_ATOM_ID, build: buildModelFilesAtom },
  { id: MODEL_EXAMPLE_FULL_ATOM_ID, build: buildModelFullExampleAtom },
] as const;

export function buildAllModelFragments(): Record<string, string> {
  const fragments: Record<string, string> = {};
  for (const spec of MODEL_FRAGMENT_SPECS) {
    fragments[spec.id] = spec.build();
  }
  return fragments;
}

export const MODEL_FRAGMENT_IDS = MODEL_FRAGMENT_SPECS.map((spec) => spec.id);
