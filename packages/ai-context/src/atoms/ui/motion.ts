export const UI_MOTION_ATOM_ID = "ui.motion";

export function buildUiMotionAtom(): string {
  return `# Motion and row effects

Animate layout nodes with \`MotionPreset\` objects.

## Row-level motion

On **component rows** (\`type: "component"\`):

\`\`\`json
{
  "type": "component",
  "id": "row_1",
  "motion": {
    "entrance": "fade",
    "durationMs": 300,
    "delayMs": 0,
    "staggerIndex": true,
    "hover": "lift",
    "transition": "layout"
  },
  "component": { "kind": "text", "primary": { "type": "field", "path": "name" } }
}
\`\`\`

## Document-level motion

On \`UiLayoutDocument\` root (layout effects for nested layouts):

\`\`\`json
{
  "motion": { "entrance": "slide-up", "durationMs": 400 },
  "root": { "type": "root", "id": "root-1", "columnCount": 1, "columns": [] }
}
\`\`\`

## MotionPreset fields

| Field | Type | Allowed values |
|-------|------|----------------|
| \`entrance\` | string | \`none\` \\| \`fade\` \\| \`slide-up\` \\| \`scale\` |
| \`durationMs\` | number | 0–2000 |
| \`delayMs\` | number | delay before animation |
| \`staggerIndex\` | boolean | stagger by row index within column |
| \`hover\` | string | \`none\` \\| \`lift\` \\| \`glow\` |
| \`transition\` | string | \`none\` \\| \`layout\` \\| \`all\` |

**Nested-layout rows** do not support \`motion\` — only component rows and document root.
`;
}
