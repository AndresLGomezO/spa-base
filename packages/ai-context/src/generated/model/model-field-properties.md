# Field properties

## Core (all types)

| Property | Type | Description |
|----------|------|-------------|
| name | string | camelCase field name (e.g. `bankId`, `totalAmount`). |
| type | FieldType | One of the closed field types. |
| required | boolean | When true, value must be present on create. Default: optional. |
| sensitive | boolean | Encrypted at rest; omit from AI display contexts. **Not allowed** on relation, image, or document fields. |
| isArray | boolean | Store multiple values. Only for string/number/boolean/date/enum/image/document. |
| ui | FieldUi | Presentation and list-query flags (see `model.field.ui`). |

## Type-specific

| Property | Applies to | Description |
|----------|------------|-------------|
| enumValues | enum | Non-empty string array of allowed values. Required for enum fields. |
| numberKind | number | `integer` or `decimal`. Optional; defaults to decimal behavior. |
| relation | relation | `{ target, type, onDelete? }`. Required for relation fields. |
| maxSizeBytes | image, document | Max upload size in bytes (cap: 52428800). Defaults: image 5MB, document 10MB. |
| defaultImage | image | Default `EntityFileReference` when no upload provided. |
