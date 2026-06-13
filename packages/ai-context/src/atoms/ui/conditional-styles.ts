export const UI_CONDITIONAL_STYLES_ATOM_ID = "ui.conditional-styles";

/** Display field components + wizard-progress that support conditionalStyles. */
export const COMPONENTS_WITH_CONDITIONAL_STYLES = [
  "text",
  "image",
  "date",
  "numeric",
  "badge",
  "wizard-progress",
] as const;

export function buildUiConditionalStylesAtom(): string {
  return `# Conditional style rules

Apply value-based styling when a component's bound field equals a specific string.

## Supported components

\`text\`, \`image\`, \`date\`, \`numeric\`, \`badge\`, \`wizard-progress\`

Add \`conditionalStyles\` array on the component config (alongside \`styles\`).

## ConditionalStyleRule shape

| Property | Type | Description |
|----------|------|-------------|
| matchValue | string | **Required.** Exact string match against the component's resolved field value (trimmed). Case-sensitive. |
| background | string | Background color: ThemeToken (\`primary\`, \`success\`, …) or CSS color / \`var(--color-*)\`. |
| textColor | string | Text color: ThemeToken or CSS color / semantic var. |
| badgeVariant | string | **Badge only.** Semantic variant when matched. |

**badgeVariant (closed):** success | warning | danger | info | default | active | pending | closed | neutral

## Matching behavior

- Rules are evaluated **in order**; first \`matchValue\` equal to the field value wins.
- Empty/null field values match \`matchValue: ""\` only if you add that rule explicitly.
- For **badge**, \`badgeVariant\` drives the badge chip color; \`background\` / \`textColor\` add optional overrides.
- For **text/date/numeric/image**, use \`background\` and \`textColor\`.
- **wizard-progress** uses rules for step status strings (e.g. \`active\`, \`completed\`, \`pending\`).

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
      "background": "success",
      "textColor": "default"
    },
    {
      "matchValue": "PENDING",
      "badgeVariant": "pending",
      "background": "warning",
      "textColor": "default"
    },
    {
      "matchValue": "CLOSED",
      "badgeVariant": "closed",
      "textColor": "muted"
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
      "textColor": "danger",
      "background": "warning"
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
    { "matchValue": "active", "background": "primary", "textColor": "default" },
    { "matchValue": "completed", "background": "success", "textColor": "default" },
    { "matchValue": "pending", "background": "muted", "textColor": "muted" }
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
