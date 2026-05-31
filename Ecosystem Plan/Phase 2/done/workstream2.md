Here's a concise summary of what was implemented in Workstream 2:

---

## Workstream 2: Relational Data System — Implementation Summary

### 1. Ownership-Respecting Reference Validation
- `EntityRecordRef` extended with an index signature so `findById` returns full records (including `ownerId`, `sharedWith`)
- New `REFERENCE_ACCESS_DENIED` error code in `@repo/entity-relations`
- `validateWrite` now accepts optional `userId` — after verifying the target record exists, it checks the caller can read it (owner or shared-with), skipping the check for `tenantWideRead` entities
- CRUD routes pass `request.ctx?.uid` through to both `validateWrite` and `beforeDelete`

### 2. Ownership-Bound Cascade Delete
- `beforeDelete` accepts optional `userId`
- `restrict` only blocks if the **caller** owns referencing records
- `cascade` / `nullify` only process records owned by the caller; other users' references are left as dangling refs (v1 acceptable)

### 3. `onDelete` in Dynamic Entity Definitions + Model Builder UI
- `relationDefinitionSchema` extended with `onDelete: z.enum(["restrict", "cascade", "nullify"]).optional()`
- `defineEntityFromRecord` uses configured `onDelete` instead of hardcoding `"restrict"`
- `FieldEditorForm` shows an On Delete dropdown for many-to-one / one-to-one fields
- `FieldDefinitionInput.relation` and `EntityDefinitionRecord` types updated in the API client

### 4. `displayField` Metadata
- `displayField?: string` added to `EntityConfig`, `EntityMetadata`, `SerializableEntityDefinition`, and dynamic entity schemas (`entityDefinitionRecordSchema`, `patchEntityDefinitionInputSchema`)
- Wired through `defineEntity`, `defineEntityFromRecord`, and `serializeEntityDefinition`
- `formatRecordDisplayLabel` prioritizes `displayField` when set, falls back to name/title/label/id heuristic
- Display Field dropdown added in both the entity wizard (step 2) and editor, populated from string fields

### 5. Server-Side `?populate=` Support
- New `apps/api/src/access/reference-populator.ts` — collects distinct FK values, batch-fetches targets, applies `checkRecordAccess` per record (inaccessible targets become `null`), returns data under a `_populated` key
- `register-crud-routes.ts` parses a `populate` query param (comma-separated field names) and populates results on list and get-by-id routes
- Wired into both static and dynamic entity route registrations via the `referencePopulator` option

### 6. FK Display in Table Columns
- `useEntity` auto-detects many-to-one / one-to-one fields and passes `?populate=` to the list API call
- `getEntityCellRawValue` reads `_populated` data for FK columns and shows human-readable labels via `formatRecordDisplayLabel` instead of raw IDs

### 7. Detail View Reference Links + RelatedRecords Component
- New `EntityRecordDetail` component — read-only record view with FK values rendered as `<Link>` elements to the target entity detail page, using populated display labels
- New `RelatedRecords` component — queries child entities filtered by FK field, renders a mini-table with View links
- `entity-edit.tsx` route converted from a redirect to a proper detail page that shows the record, FK links, and reverse one-to-many relation lists

### Key Files Modified/Created
| Layer | Files |
|-------|-------|
| Entity types | `packages/entities/src/types.ts`, `defineEntity.ts`, `ui/types.ts`, `ui/serialize-entity-definition.ts` |
| Dynamic entities | `packages/dynamic-entities/src/types.ts`, `define-entity-from-record.ts` |
| Relation engine | `packages/entity-relations/src/types.ts`, `errors.ts`, `relation-validator.ts`, `index.ts` |
| API | `apps/api/src/relations/create-relation-services.ts`, `crud/register-crud-routes.ts`, `access/reference-populator.ts`, `entities/register-dynamic-entity-crud-routes.ts`, `server.ts` |
| Frontend | `apps/web/app/lib/api-client.ts`, `hooks/useEntity.ts`, `components/entity/resolve-entity-cell-value.ts`, `format-record-display-label.ts`, `EntityRecordDetail.tsx`, `RelatedRecords.tsx`, `components/data-models/FieldEditorForm.tsx`, `EntityDefinitionEditor.tsx`, `EntityDefinitionWizard.tsx` |
| Route | `apps/web/app/routes/app/entity-edit.tsx` |