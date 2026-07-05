export const LIST_PRESENTATION_SELECTION_FRAGMENT_ID =
  "ui.list.presentation-selection";

export const LIST_PRESENTATION_SELECTION_GUIDANCE = `# List presentation selection

Choose exactly ONE listViewType before designing layout JSON. In the designer, presentation is selected via **layout preset** (platform built-in or tenant preset) — not a separate view-type switch.

## table
Default preset: \`plain-table-list\`.
Best when:
- Many scalar fields benefit from side-by-side scanning
- Desktop-first admin lists with sortable columns
- Simple field path columns (no per-column layout tree)

## card
Default preset: \`card-list\`.
Best when:
- Mobile-first browsing with visual hierarchy
- Badges, images, icons, relations, or multi-column card rows
- Each record needs a rich layout tree (listItem)
- The user wants a **differentiated, premium, visual** list — not a plain data grid

Prefer **card** when the entity has image/logo/avatar fields or when the user asks for beautiful, modern, or mobile-friendly UI.

## expandableTable
Default preset: \`expandable-table-list\`.
Best when:
- Grouped columns with per-column cell layouts
- Expandable row detail for secondary fields
- Mixed density: compact summary columns + expanded detail panel

If the user prefers a type, honor that preference unless entity fields clearly fit another type better.
When the user asks for creative, colorful, or best-in-class UX, lean toward **card** or **expandableTable** with rich cell layouts.
`;
