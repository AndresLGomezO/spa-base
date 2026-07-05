# Validation errors

Common errors when importing layout JSON or design-layout-slice envelopes, with causes and fixes.

Errors return `{ "path": "…", "message": "…" }` objects. Multiple errors may appear in one validation pass.

---

## JSON syntax

| Message | Cause | Fix |
|---------|-------|-----|
| `Invalid JSON.` | Malformed JSON (trailing comma, unquoted key, etc.) | Validate with a JSON linter; ensure double quotes on keys and strings |

---

## Envelope structure

| Path | Message pattern | Fix |
|------|-----------------|-----|
| `(root)` | Zod schema failure on envelope | Ensure `kind`, `surface`, `version`, `data` are present |
| `kind` | Expected `"design-layout-slice"` | Set `"kind": "design-layout-slice"` |
| `version` | Expected `1` | Set `"version": 1` |
| `surface` | Expected surface `"list"` but got `"forms"` | Match `surface` to the import target |
| `data` | Nested schema errors | See surface-specific sections below |

---

## Layout document schema

| Path | Message pattern | Fix |
|------|-----------------|-----|
| `root.columnCount` | `root.columnCount must match columns.length` | Set `columnCount` equal to `columns` array length |
| `root.type` | Invalid discriminator | Use `"root"` or `"screen-root"` |
| `component.kind` | Invalid enum value | Use an allowed component kind for the surface |
| `styles.N.property` | Invalid enum value | Use a property from the [style reference](./style-property-reference.md) |
| `styles.N.value` | Type error | Ensure `value` is a string |

---

## Import scope errors

When pasting partial JSON in the builder:

| Scope | Accepts |
|-------|---------|
| `layout-document` | Full `UiLayoutDocument` |
| `column` | `ColumnNode` (legacy) |
| `component-row` | Single component row |
| `insertable-row` | Component row or grid track row |

| Message | Fix |
|---------|-----|
| Schema mismatch for scope | Wrap content in the correct envelope for the chosen import action |
| Missing `root` | Full layout documents require a `root` object |

---

## Surface / component kind

| Message | Fix |
|---------|-----|
| `Component kind "form-field" is not allowed on surface "listItem".` | Use display components (`text`, `numeric`, …) on list surfaces; reserve `form-field` for form surfaces |
| `Component kind "page-list" is not allowed on surface "recordDetail".` | Page slots only on `mainPage` |
| `Component kind "wizard-progress" is not allowed on surface "formPlain".` | Wizard shell components only on `formWizardShell` |

Refer to the [README surface table](../README.md#surface--allowed-component-families) for allowed kinds per surface.

---

## Field path errors (display)

| Message pattern | Fix |
|-----------------|-----|
| `Invalid listItem layout field path "bankId" for entity "Account".` | Use display path `bank.name` instead of FK `bankId` on display components |
| `Invalid recordDetail layout field path "unknown" for entity "…".` | Use a field that exists on the entity or valid relation subpath |
| Path with 3+ segments invalid | Check relation chain exists; verify target entity fields |

**Display path rules:**

- Relation labels: `relationName.subField` or `relationId.subField`
- Top-level scalars: `name`, `status`, `amount`
- Not FK fields for related labels: prefer `bank.name` over `bankId`

---

## Field path errors (forms)

| Message pattern | Fix |
|-----------------|-----|
| `Invalid formPlain form field path "bank.name" for entity "…".` | Use `bankId` (FK field name), not dot notation |
| `Invalid formPlain entity field selector path "name" for entity "…".` | Selectors require enum or relation fields — use `accountTypeId`, `bankId`, etc. |
| `Invalid … form field path "document" for entity "…".` | Document-type fields cannot be form fields |

---

## Root structure

| Symptom | Fix |
|---------|-----|
| Import succeeds but layout looks wrong | Ensure single `container` at root with content in `container.rows` |
| Multi-column at root | Move columns into `container` → `grid` |
| `nested-layout` rows | Replace with `kind: "grid"` |

---

## Wizard shell

| Message pattern | Fix |
|-----------------|-----|
| Wizard shell validation failure | Include `wizard-progress`, `wizard-step-host`, and `wizard-actions` (unless actions are in modal footer) |
| Duplicate wizard step id | Ensure unique `id` per step in `forms.wizard.steps` |

---

## Style validation

| Message pattern | Fix |
|-----------------|-----|
| `root.styles` style props error | Check property names and value types |
| Invalid ThemeToken | Use closed token set: `default`, `muted`, `primary`, `success`, `warning`, `danger`, `info`, `background`, `foreground`, `transparent` |
| Invalid `boxShadow` | Use `none` or `card` |

---

## Semantic validation

| Path | Message pattern | Fix |
|------|-----------------|-----|
| `(semantic)` | Entity UI config validation message | Often a cross-field rule — e.g. missing required view, invalid metric reference, wizard step without layout |

Run validation against the correct entity definition. Field paths are entity-specific.

---

## Metric errors

| Symptom | Fix |
|---------|-----|
| Unknown `metricDefinitionId` | Use an ID from the platform metric catalog |
| Missing binding key | Add required parameter to `groupBindings` or `dimensionBindings` |
| `metric-widget` not rendering | Ensure `widgetId` exists in `metricWidgets` for the entity |

---

## List slice specific

| Path | Message | Fix |
|------|---------|-----|
| `data.table.fields` | Array min length | Provide at least one column field path |
| `data.expandableTable.columns` | Array min length | At least one grouped column with `cellLayout` |
| `data.listViewType` | Invalid enum | Use `table`, `card`, `expandableTable`, or `compact` |

---

## Quick fix checklist

1. **Validate JSON syntax** — no comments, no trailing commas
2. **Match surface** — envelope `surface` equals import target
3. **Check component kinds** — allowed on active design surface
4. **Fix field paths** — display vs form conventions
5. **Verify root structure** — one container, grids for columns
6. **Regenerate IDs** — duplicate `id` values may confuse the builder; use unique row ids
7. **Re-run import** — builder normalizes legacy `nested-layout` to `grid` on success

---

## Related

- [Form field paths](../02-data-binding/form-field-paths.md)
- [Data sources](../02-data-binding/data-sources.md)
- [Envelope examples](./envelope-examples.md)
