export const UI_METRIC_BINDINGS_ATOM_ID = "ui.metric-bindings";

export function componentSupportsMetricBindings(kind: string): boolean {
  return kind === "metric-kpi";
}

export function buildUiMetricBindingsAtom(): string {
  return `# Metric binding sources

\`metric-kpi\` components bind metric parameters via \`groupBindings\` and \`dimensionBindings\`.

Each key is a parameter name from the metric definition; each value is a \`MetricBindingSource\`.

## MetricBindingSource shapes

| type | Fields | Value |
|------|--------|-------|
| \`static\` | \`value\` | \`string\` \\| \`number\` \\| \`boolean\` |
| \`entityField\` | \`fieldPath\` | Entity field path string |
| \`listFilter\` | \`field\` | List filter field name |
| \`routeParam\` | \`param\` | Route param name |

## Example

\`\`\`json
{
  "kind": "metric-kpi",
  "metricDefinitionId": "metric_total_revenue",
  "label": "Total Revenue",
  "groupBindings": {
    "region": { "type": "static", "value": "US" }
  },
  "dimensionBindings": {
    "accountId": { "type": "entityField", "fieldPath": "id" },
    "period": { "type": "listFilter", "field": "period" }
  }
}
\`\`\`

\`metric-widget\` references a pre-built widget by \`entityName\` + \`widgetId\` — no bindings on the component itself.
`;
}
