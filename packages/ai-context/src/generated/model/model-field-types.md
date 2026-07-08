# Field types (closed set)

| type | Stored value | Notes |
|------|--------------|-------|
| string | string | Text; supports `isArray`. |
| number | number | Use `numberKind`: `integer` or `decimal`; supports `isArray`. |
| boolean | boolean | true/false; supports `isArray`. |
| date | string (ISO 8601) | e.g. `"2026-06-13T12:00:00.000Z"`; supports `isArray`. |
| enum | string | Must be one of `enumValues`; supports `isArray`. |
| relation | string (id) or string[] | Requires `relation` config; **cannot** be sensitive or array. |
| image | EntityFileReference | JPEG/PNG/WebP; max size via `maxSizeBytes`; supports `isArray`. |
| document | EntityFileReference | PDF only; max size via `maxSizeBytes`; supports `isArray`. |

**Array eligibility:** only `string`, `number`, `boolean`, `date`, `enum`, `image`, `document` may set `isArray: true`. Relation fields cannot be arrays.
