import type { TenantAppearance } from "@repo/shared-types";
import { appearanceToCssVariables } from "@repo/theme/tenant-overrides";

import {
  buildThemeLayoutTokensAtom,
  buildThemeStyleRulesAtom,
  THEME_LAYOUT_TOKENS_ATOM_ID,
  THEME_STYLE_RULES_ATOM_ID,
} from "../atoms/theme/style-rules.js";
import { hashSourceValue } from "../utils/hash.js";

export const THEME_TENANT_SNAPSHOT_FRAGMENT_ID = "theme.tenant.snapshot";

export interface ThemeContextBuildResult {
  readonly sourceHash: string;
  readonly fragments: Record<string, string>;
  readonly assembled: string;
}

function formatOverrides(vars: Record<string, string>): string {
  const entries = Object.entries(vars);
  if (entries.length === 0) {
    return "_No tenant-specific overrides (platform defaults)._";
  }

  const lines = entries
    .slice(0, 40)
    .map(([key, value]) => `- \`${key}\`: \`${value}\``);
  if (entries.length > 40) {
    lines.push(`- … and ${entries.length - 40} more`);
  }
  return lines.join("\n");
}

function buildTenantExampleRules(
  appearance: TenantAppearance | undefined,
): string {
  const preset = appearance?.preset ?? "default";
  return `\`\`\`json
[
  {"property":"backgroundColor","value":"primary"},
  {"property":"color","value":"var(--color-foreground)"},
  {"property":"padding","value":"12px"},
  {"property":"borderRadius","value":"8px"}
]
\`\`\`
_Preset: ${preset}. Use ThemeToken "primary" to inherit tenant primary palette._`;
}

export function buildThemeContext(
  appearance: TenantAppearance | undefined,
): ThemeContextBuildResult {
  const sourceHash = hashSourceValue(appearance ?? null);
  const resolvedVars = appearanceToCssVariables(appearance ?? {});

  const styleRules = buildThemeStyleRulesAtom();
  const layoutTokens = buildThemeLayoutTokensAtom();

  const snapshot = `# Tenant theme snapshot

**Preset:** ${appearance?.preset ?? "default"}

## Resolved CSS variables (tenant-specific)
${formatOverrides(resolvedVars)}

## Example style rules for this tenant
${buildTenantExampleRules(appearance)}
`;

  const fragments: Record<string, string> = {
    [THEME_STYLE_RULES_ATOM_ID]: styleRules,
    [THEME_LAYOUT_TOKENS_ATOM_ID]: layoutTokens,
    [THEME_TENANT_SNAPSHOT_FRAGMENT_ID]: snapshot,
  };

  const assembled = [
    "## Theme styling",
    styleRules,
    layoutTokens,
    snapshot,
  ].join("\n\n");

  return { sourceHash, fragments, assembled };
}

export function themeContextSourceHash(
  appearance: TenantAppearance | undefined,
): string {
  return hashSourceValue(appearance ?? null);
}
