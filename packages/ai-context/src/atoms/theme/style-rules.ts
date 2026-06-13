import {
  STYLE_PROPERTY_OPTIONS,
  type StylePropertyKey,
  type ThemeToken,
} from "@repo/ui-builder-core";

const COLOR_PROPERTIES: readonly StylePropertyKey[] = [
  "backgroundColor",
  "color",
  "borderColor",
];

const PIXEL_PROPERTIES: readonly StylePropertyKey[] = [
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "padding",
  "gap",
  "fontSize",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderWidth",
  "minWidth",
  "maxWidth",
];

const THEME_TOKENS: readonly ThemeToken[] = [
  "default",
  "muted",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "background",
  "foreground",
  "transparent",
];

const SEMANTIC_CSS_VARS = [
  "var(--color-background)",
  "var(--color-foreground)",
  "var(--color-primary)",
  "var(--color-primary-foreground)",
  "var(--color-muted)",
  "var(--color-muted-foreground)",
  "var(--color-border)",
  "var(--color-card)",
  "var(--color-card-foreground)",
  "var(--color-popover)",
  "var(--color-accent)",
  "var(--color-hover)",
] as const;

export const THEME_STYLE_RULES_ATOM_ID = "theme.style-rules";

export function buildThemeStyleRulesAtom(): string {
  const colorProps = COLOR_PROPERTIES.join(", ");
  const pixelProps = PIXEL_PROPERTIES.slice(0, 8).join(", ");

  return `# UI Builder styling rules

## Color properties (${colorProps})
- Prefer **ThemeToken** or semantic \`var(--color-*)\` values.
- Custom hex (\`#rrggbb\`) only for one-off accents.

**ThemeToken (closed):** ${THEME_TOKENS.join(" | ")}

**Semantic CSS vars:** ${SEMANTIC_CSS_VARS.join(", ")}

## Layout properties (${pixelProps}, …)
- Use **pixel strings** (e.g. \`"8px"\`, \`"16px"\`).
- Do not use theme spacing tokens in style rules.

## All style properties
${STYLE_PROPERTY_OPTIONS.join(", ")}

## Example style rules
\`\`\`json
[
  {"property":"backgroundColor","value":"primary"},
  {"property":"color","value":"var(--color-foreground)"},
  {"property":"padding","value":"12px"},
  {"property":"borderRadius","value":"8px"}
]
\`\`\`
`;
}

export const THEME_LAYOUT_TOKENS_ATOM_ID = "theme.layout-tokens";

export function buildThemeLayoutTokensAtom(): string {
  return `# Platform layout tokens (reference)

Tenant branding may override these CSS variables at runtime:
- \`--radius-md\` — default border radius
- \`--spacing\` — Tailwind spacing multiplier (default 0.25rem)
- \`--text-body\`, \`--text-heading\` — typography sizes
- \`--font-sans\` — font family

UI Builder style rules use **pixel values** for radius/spacing, not these tokens directly.
`;
}
