# Metric definition sources

Metric definitions are authored in **Settings → Metrics**, not in layout JSON. Layout components (`metric-kpi`, `metric-derived-kpi`, Series widgets) reference definitions by `metricDefinitionId` only — they do not configure how the metric is populated.

---

## Source modes

| Mode | Fields | Population |
|------|--------|------------|
| **Entity** | `sourceModel` only | All records of the entity, optionally narrowed by metric `filters[]` |
| **Custom query** | `sourceQueryDefinitionId` + `sourceModel` | Records matching a saved query (`limitMode: "all"`, `ACTIVE`) |

For query-backed metrics, `sourceModel` must equal the query's `sourceEntity`. Metric `filters[]` are ignored — the query filter tree defines membership.

---

## When to use each mode

**Entity source** — simple aggregates over a whole entity or a small set of metric-level filters (e.g. `type = INCOME`).

**Custom query source** — population already defined in Query Builder (complex filter trees, reusable query logic shared with `query-viewer` widgets). Avoid duplicating the same filters on both the query and the metric.

**Not eligible as metric sources:** queries with `limitMode: "topN"` (ranked slices, not full populations).

---

## Authoring workflow

1. **Entity metrics** — Settings → Metrics → create metric → source type **Entity** → set `sourceModel`, filters, aggregations.
2. **Query-backed metrics** — create or import the query first (Settings → Query Builder), then create metric → source type **Custom query** → pick an ACTIVE `limitMode: "all"` query. `sourceModel` is set from the query's entity.
3. **Wire layouts** — bind `metricDefinitionId` in Design layout ([metric bindings](./metric-bindings.md)). Query-backed and entity-backed definitions use the same binding shapes at runtime.

Portable JSON: [metric-definition.md](../../reference/metric-definition.md) (`sourceQueryDefinitionId`). Query catalog: [entity-query-definition.md](../../reference/entity-query-definition.md).

---

## Delete protection

A custom query **cannot be deleted** (single delete or catalog replace removal) while any metric references it via `sourceQueryDefinitionId`. Remove or repoint metrics first.

UI layout references (`entityQueryDefinitionId` on `query-viewer`) are **not** guarded — only metric references block deletion today.

---

## Related

- [Metric bindings](./metric-bindings.md) — `groupBindings` / `dimensionBindings` on layout components
- [Metrics and dashboard](../04-surfaces-and-pages/metrics-and-dashboard.md) — where KPIs appear in layouts
- [Component: query-viewer](../03-components/query-viewer.md) — layout binding to the same query catalog
