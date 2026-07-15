# Rates tenant seed catalogs

Each catalog component is a directory of **singular** JSON envelopes:

```json
{ "kind": "<definition-kind>", "version": 1, "data": { ... } }
```

Seed merges every `*.json` in a component directory (skipping `_*.json` meta files) into a catalog envelope and replaces the tenant catalog.

| Directory | Items key | Filename |
|-----------|-----------|----------|
| `entity-definitions/` | `entityDefinitions` | kebab-case entity `name` (`financial-item.json`) |
| `entity-definitions/_categories.json` | `entityCategories` | meta only |
| `data-hooks/` | `dataHooks` | kebab-case hook `name` |
| `query-definitions/` | `entityQueryDefinitions` | kebab-case query `name` |
| `metric-definitions/` | `metricDefinitions` | kebab-case metric `name` |
| `chart-definitions/` | `chartDefinitions` | kebab-case chart `name` |
| `formula-definitions/` | `formulaDefinitions` | kebab-case formula `name` |
| `custom-views/` | `customViews` | kebab-case view `name` |
| `entity-ui-overrides/` | `overrides` | `{entityName}.json` |
| `ui-builder-presets/` | `presets` | kebab-case preset `name` |

Single-document UI shell catalogs remain files:

- `rates-tenant-appearance.json`
- `rates-tenant-dashboard-layout.json`
- `rates-tenant-sidebar-layout.json`

`removed/` is an archive only — seed does not read it.
