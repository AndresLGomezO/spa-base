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

const DIMENSION_PROPERTIES: readonly StylePropertyKey[] = [
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
  "letterSpacing",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
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

export const THEME_STYLE_RULES_ATOM_ID = "theme.style-rules";

export function buildThemeStyleRulesAtom(): string {
  const colorProps = COLOR_PROPERTIES.join(", ");
  const dimensionProps = DIMENSION_PROPERTIES.slice(0, 8).join(", ");

  return `# UI Builder styling rules

## Color properties (${colorProps})
- Prefer **ThemeToken** or semantic \`var(--color-*)\` values from the theme catalog (semantic, sidebar, badge, palette scale, effects/gradients).
- Custom hex (\`#rrggbb\`), rgb/hsl, or \`var(--color-*)\` for one-off accents.
- Gradients (\`var(--gradient-primary)\`, \`linear-gradient(...)\`) use the CSS \`background\` property at render time.

**ThemeToken (closed):** ${THEME_TOKENS.join(" | ")}

**Tenant custom tokens:** Tenants may define \`customTokens\` in appearance. They appear under **Custom tokens** in the color picker when configured.

## Shadow (\`boxShadow\`)
- **Theme shortcuts:** \`none\`, \`card\` (maps to Tailwind \`shadow-none\` / \`shadow-card\`, tenant-overridable via \`--shadow-card\`).
- **Custom:** \`var(--shadow-card)\` or full box-shadow strings.

## Typography (\`fontFamily\`)
- Theme: \`var(--font-sans)\`
- Custom font stacks allowed.

## Dimension properties (${dimensionProps}, …)
- **Theme mode:** \`var(--radius-*)\`, \`var(--spacing-*)\`, \`var(--text-body)\`, \`var(--text-heading)\`, \`var(--sidebar-width)\` for width/height props.
- **Custom mode:** pixel strings (e.g. \`"8"\`, \`"-40"\`), \`"100%"\`, or \`"auto"\` — integers render as \`px\`.
- **Margin** (\`marginTop\`, …): integers from \`-999\` through any positive value on the **row wrapper**.
- **Overflow** (\`overflowX\`, \`overflowY\`): row wrapper.
- **Positioning** (\`position\`, \`top\`, \`right\`, \`bottom\`, \`left\`, \`width\`, \`height\`, \`zIndex\`, \`pointerEvents\`, \`opacity\`, \`backdropFilter\`): row wrapper inline styles.
- **Padding**, **gap**, **border radius**, **fontSize**, **min/max width/height**: component/container inline styles.

## Image overlay (\`displayMode: "overlay"\`)
- Use on decorative chart/background images inside \`container\` rows.
- Renderer auto-layers overlay images behind sibling content (\`zIndex\` 0 vs 1) and sets the container to \`position: relative\` unless overridden.
- Prefer \`objectFit: "cover"\` for full-bleed overlays; \`imageSize\` is ignored in overlay mode.

## All style properties
${STYLE_PROPERTY_OPTIONS.join(", ")}

## Example style rules
\`\`\`json
[
  {"property":"backgroundColor","value":"primary"},
  {"property":"boxShadow","value":"card"},
  {"property":"color","value":"var(--color-foreground)"},
  {"property":"padding","value":"var(--spacing-macro)"},
  {"property":"borderRadius","value":"var(--radius-lg)"},
  {"property":"fontFamily","value":"var(--font-sans)"}
]
\`\`\`
`;
}

export const THEME_LAYOUT_TOKENS_ATOM_ID = "theme.layout-tokens";

export function buildThemeLayoutTokensAtom(): string {
  return `# Platform layout tokens (reference)

Tenant branding may override these CSS variables at runtime:
- \`--radius-sm\`, \`--radius-md\`, \`--radius-lg\` — border radius
- \`--spacing-tight\` … \`--spacing-section\` — semantic spacing scale
- \`--text-body\`, \`--text-heading\` — typography sizes
- \`--font-sans\` — font family
- \`--shadow-card\` — card elevation shadow

Do not override \`--spacing\` (Tailwind's numeric scale multiplier; default 0.25rem).

UI Builder style rules may reference these tokens directly on supported dimension, shadow, typography, and color properties.
`;
}
