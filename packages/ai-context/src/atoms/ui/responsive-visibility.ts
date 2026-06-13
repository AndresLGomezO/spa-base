export const UI_RESPONSIVE_VISIBILITY_ATOM_ID = "ui.responsive-visibility";

export function buildUiResponsiveVisibilityAtom(): string {
  return `# Responsive screen visibility

Control which viewport breakpoints render layout nodes. The platform must work from mobile through XL desktop — use these fields for multiscreen layouts.

## Breakpoints (inclusive range)

| Value | Viewport |
|-------|----------|
| \`base\` | Mobile default (< 640px) |
| \`sm\` | 640px+ |
| \`md\` | 768px+ (tablet) |
| \`lg\` | 1024px+ (desktop) |
| \`xl\` | 1280px+ |

Order: \`base\` → \`sm\` → \`md\` → \`lg\` → \`xl\`.

## Fields

| Field | Type | Default when omitted |
|-------|------|---------------------|
| \`displayFrom\` | breakpoint | \`base\` |
| \`displayTo\` | breakpoint | \`xl\` |

A node is visible when \`index(displayFrom) ≤ currentBreakpoint ≤ index(displayTo)\`. Omitted both = visible on **all** screens.

## Where to attach

| Node | Applies to |
|------|------------|
| **Component row** (\`type: "component"\`) | That row and its component |
| **Nested-layout row** (\`type: "nested-layout"\`) | Entire nested grid |
| **Column** (\`ColumnNode\`) | Entire column and its rows |
| **Expandable-table column** | Per-column \`cellLayout\` visibility (grouped table columns) |

Visibility is **not** on individual component configs — set it on the row or column wrapping the component.

## Platform rules for AI

1. **Mobile-first:** design for \`base\` first; add wider-screen-only content via \`displayFrom: "md"\` or similar.
2. **Never hide critical form fields** on mobile without a mobile alternative in the same layout.
3. **Prefer responsive grid** (\`gridColumns*\` on nested-layout rows) for column reflow; use visibility when content should appear/disappear entirely.
4. Rows outside the range use \`display: none\` and do not occupy layout space.

## Examples

**Tablet and desktop only:**

\`\`\`json
{
  "type": "component",
  "id": "row_category",
  "displayFrom": "md",
  "displayTo": "xl",
  "component": { "kind": "form-field", "fieldPath": "categoryId" }
}
\`\`\`

**Mobile-only static hint:**

\`\`\`json
{
  "type": "component",
  "id": "row_hint",
  "displayFrom": "base",
  "displayTo": "base",
  "component": {
    "kind": "text",
    "primary": { "type": "static", "value": "Swipe for details" }
  }
}
\`\`\`

**Hide sidebar column on mobile:**

\`\`\`json
{
  "id": "col_sidebar",
  "displayFrom": "md",
  "displayTo": "xl",
  "rows": []
}
\`\`\`
`;
}
