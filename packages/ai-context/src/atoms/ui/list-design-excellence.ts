export const LIST_DESIGN_EXCELLENCE_FRAGMENT_ID = "ui.list.design-excellence";

export const LIST_DESIGN_EXCELLENCE_GUIDANCE = `# List layout design excellence

Design layouts that feel premium, memorable, and differentiated — not generic admin tables.

## Visual-first hierarchy
- **Lead with imagery** when the entity has image/file/logo/avatar/url fields: put an \`image\` component in the first column or top-left slot.
- When no image field exists, use a meaningful \`icon\` (pick a Lucide-style name that fits the entity) as the visual anchor.
- Reserve plain \`text\` stacks for secondary metadata — never make every slot a bare text row.

## Color and polish
- **Theme first:** use ThemeToken (\`primary\`, \`success\`, \`warning\`, \`danger\`, \`info\`, \`muted\`) and semantic \`var(--color-*)\` for backgrounds, text, and borders.
- **Custom accents:** sparing one-off hex (\`#rrggbb\`) or CSS vars for hero emphasis only — e.g. card accent border or title highlight.
- Use \`badge\` with \`conditionalStyles\` for status/enum fields — map each value to a semantic \`badgeVariant\` and color.
- Apply \`styles\` on titles (bold, larger fontSize), muted secondary lines, generous padding, and rounded corners on visual blocks.

## Component mix (card / cell layouts)
- Combine \`image\` or \`icon\` + bold \`text\` title + \`badge\` status + \`date\`/\`numeric\` metadata in one card.
- Prefer **2–3 column nested-layout** rows over a single flat column when it improves scanability.
- Use \`label\` config intentionally: hide labels on obvious titles; show concise labels on metadata.
- Set \`imageSize\` (48–96) for avatars/logos; use \`displayFormat\` on numeric fields when amounts matter.

## UX bar
- Mobile-first: important visuals and titles visible at \`base\`; tuck secondary fields behind \`md\`+ or a second column.
- Create clear primary → secondary → tertiary reading order.
- Aim for the craft of best-in-class SaaS (Stripe, Linear, Notion, Shopify) — confident whitespace, purposeful color, no wall-of-text cards.
- Surprise the user with thoughtful layout choices that fit **this entity's** fields — not a template of identical text rows.
`;
