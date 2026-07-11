export const UI_CONDITIONAL_STYLES_ATOM_ID = "ui.conditional-styles";

/** Entity-bound stylable components + wizard-progress that support conditionalStyles. */
export const COMPONENTS_WITH_CONDITIONAL_STYLES = [
  "text",
  "image",
  "date",
  "numeric",
  "badge",
  "container",
  "grid",
  "icon",
  "metric-kpi",
  "metric-derived-kpi",
  "metric-widget",
  "chart",
  "query-viewer",
  "user",
  "notification-bell",
  "form-field",
  "entity-field-selector",
  "form-section",
  "related-records",
  "wizard-progress",
] as const;

export function buildUiConditionalStylesAtom(): string {
  return `# Conditional style rules

Apply styling when a condition matches: entity field value, or the current route pathname (\`activePath\`).

## Supported components

Field components (\`text\`, \`image\`, \`date\`, \`numeric\`, \`badge\`), layout shells (\`container\`, \`grid\`, \`query-viewer\`), and other entity-bound stylable components (\`icon\`, \`metric-kpi\`, \`metric-derived-kpi\`, \`metric-widget\`, \`chart\`, \`user\`, \`notification-bell\`, \`form-field\`, \`entity-field-selector\`, \`form-section\`, \`related-records\`), plus \`wizard-progress\` (step status only).

Add \`conditionalStyles\` array on the component config (alongside \`styles\`).

## ConditionalStyleRule shape

| Property | Type | Description |
|----------|------|-------------|
| conditionKind | \`"field"\` \\| \`"activePath"\` | **Optional.** Defaults to \`"field"\`. Use \`"activePath"\` to match the current route pathname. |
| matchValue | string | **Required.** For field: exact string match, or daysRemaining threshold (\`<=7\`). For activePath: path prefix (e.g. \`/app/transactions\`). |
| compareFieldPath | string | **Optional.** Entity field path to compare (field rules only). Defaults to the component's bound field when omitted. |
| compareFieldDateFormat | string | **Optional.** Date format for date compare fields: \`date\`, \`datetime\`, \`time\`, or \`daysRemaining\`. Ignored for activePath. |
| styles | StyleRule[] | **Preferred.** Full style rules (same shape as component \`styles\`). |
| background | string | **Legacy.** Background color: ThemeToken or CSS color. Normalized to \`backgroundColor\` when \`styles\` is absent. |
| textColor | string | **Legacy.** Text color: ThemeToken or CSS color. Normalized to \`color\` when \`styles\` is absent. |
| badgeVariant | string | **Badge only.** Semantic variant when matched. |

**badgeVariant (closed):** success | warning | danger | info | default | active | pending | closed | neutral

## Matching behavior

- Rules are evaluated **in order**; first matching rule wins (field and activePath rules may be mixed).
- **activePath:** pathname only (ignore query/hash). \`/\` is exact-only; other paths match exact or any subpath (\`/app/deal\` matches \`/app/deal/new\`).
- Empty/null field values match \`matchValue: ""\` only if you add that rule explicitly.
- Prefer \`styles\` for new rules; legacy \`background\` / \`textColor\` still work via runtime normalization.
- For **badge**, \`badgeVariant\` drives the badge chip color; nested \`styles\` or legacy colors add optional overrides.
- For **text/date/numeric/image**, use nested \`styles\` (or legacy \`background\` / \`textColor\`).
- **wizard-progress** uses rules for step status strings (e.g. \`active\`, \`completed\`, \`pending\`).
- **date + daysRemaining format:** match numeric thresholds as strings (e.g. \`"0"\`, \`"7"\`, \`"30"\`).

## Active path example — footer nav highlight

\`\`\`json
{
  "kind": "container",
  "conditionalStyles": [
    {
      "conditionKind": "activePath",
      "matchValue": "/app/transactions",
      "styles": [
        { "property": "color", "value": "primary" },
        { "property": "backgroundColor", "value": "accent" }
      ]
    }
  ],
  "clickAction": {
    "type": "externalUrl",
    "url": { "type": "static", "value": "/app/transactions" }
  }
}
\`\`\`

## Badge example — status-based colors

Field \`status\` with enum values \`ACTIVE\`, \`PENDING\`, \`CLOSED\`:

\`\`\`json
{
  "kind": "badge",
  "primary": { "type": "field", "path": "status" },
  "conditionalStyles": [
    {
      "matchValue": "ACTIVE",
      "badgeVariant": "success",
      "styles": [
        { "property": "backgroundColor", "value": "success" },
        { "property": "color", "value": "default" }
      ]
    },
    {
      "matchValue": "PENDING",
      "badgeVariant": "pending",
      "styles": [
        { "property": "backgroundColor", "value": "warning" }
      ]
    },
    {
      "matchValue": "CLOSED",
      "badgeVariant": "closed",
      "styles": [{ "property": "color", "value": "muted" }]
    }
  ]
}
\`\`\`

## Text example — highlight overdue dates

\`\`\`json
{
  "kind": "text",
  "primary": { "type": "field", "path": "priority" },
  "conditionalStyles": [
    {
      "matchValue": "high",
      "styles": [
        { "property": "color", "value": "danger" },
        { "property": "backgroundColor", "value": "warning" },
        { "property": "fontWeight", "value": "600" }
      ]
    }
  ]
}
\`\`\`

## Container example — compare another field (days remaining)

\`\`\`json
{
  "kind": "container",
  "rows": [],
  "conditionalStyles": [
    {
      "compareFieldPath": "dueDate",
      "compareFieldDateFormat": "daysRemaining",
      "matchValue": "<=7",
      "styles": [{ "property": "backgroundColor", "value": "warning" }]
    }
  ]
}
\`\`\`

## wizard-progress example — step states

\`\`\`json
{
  "kind": "wizard-progress",
  "variant": "stepper",
  "conditionalStyles": [
    {
      "matchValue": "active",
      "styles": [{ "property": "backgroundColor", "value": "primary" }]
    },
    {
      "matchValue": "completed",
      "styles": [{ "property": "backgroundColor", "value": "success" }]
    },
    {
      "matchValue": "pending",
      "styles": [
        { "property": "backgroundColor", "value": "muted" },
        { "property": "color", "value": "muted" }
      ]
    }
  ]
}
\`\`\`
`;
}

export function componentSupportsConditionalStyles(kind: string): boolean {
  return (COMPONENTS_WITH_CONDITIONAL_STYLES as readonly string[]).includes(
    kind,
  );
}
