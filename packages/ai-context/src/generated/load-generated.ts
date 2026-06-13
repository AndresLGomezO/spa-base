import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildThemeLayoutTokensAtom,
  buildThemeStyleRulesAtom,
  THEME_LAYOUT_TOKENS_ATOM_ID,
  THEME_STYLE_RULES_ATOM_ID,
} from "../atoms/theme/style-rules.js";
import {
  buildUiDataSourcesAtom,
  buildUiLayoutBaseAtom,
  buildUiStyleRulesAtom,
  UI_DATA_SOURCES_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
} from "../atoms/ui/layout-document.js";
import {
  buildUiConditionalStylesAtom,
  UI_CONDITIONAL_STYLES_ATOM_ID,
} from "../atoms/ui/conditional-styles.js";
import {
  buildUiLabelConfigAtom,
  UI_LABEL_CONFIG_ATOM_ID,
} from "../atoms/ui/label-config.js";
import {
  buildUiMetricBindingsAtom,
  UI_METRIC_BINDINGS_ATOM_ID,
} from "../atoms/ui/metric-bindings.js";
import { buildUiMotionAtom, UI_MOTION_ATOM_ID } from "../atoms/ui/motion.js";
import {
  buildUiResponsiveVisibilityAtom,
  UI_RESPONSIVE_VISIBILITY_ATOM_ID,
} from "../atoms/ui/responsive-visibility.js";
import {
  buildUiStyleLayersAtom,
  UI_STYLE_LAYERS_ATOM_ID,
} from "../atoms/ui/style-layers.js";

export interface AiContextManifest {
  readonly versionHash: string;
  readonly generatedAt?: string;
  readonly fragments: Record<string, string>;
}

function resolveGeneratedDir(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));

  const bundledDir = join(moduleDir, "ai-context-generated");
  if (existsSync(join(bundledDir, "manifest.json"))) {
    return bundledDir;
  }

  if (existsSync(join(moduleDir, "manifest.json"))) {
    return moduleDir;
  }

  return moduleDir;
}

function loadManifestFromDisk(): AiContextManifest | null {
  const generatedDir = resolveGeneratedDir();
  const manifestPath = join(generatedDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as AiContextManifest;
}

export function getStaticAtomFragments(): Record<string, string> {
  return {
    [THEME_STYLE_RULES_ATOM_ID]: buildThemeStyleRulesAtom(),
    [THEME_LAYOUT_TOKENS_ATOM_ID]: buildThemeLayoutTokensAtom(),
    [UI_LAYOUT_BASE_ATOM_ID]: buildUiLayoutBaseAtom(),
    [UI_RESPONSIVE_VISIBILITY_ATOM_ID]: buildUiResponsiveVisibilityAtom(),
    [UI_DATA_SOURCES_ATOM_ID]: buildUiDataSourcesAtom(),
    [UI_LABEL_CONFIG_ATOM_ID]: buildUiLabelConfigAtom(),
    [UI_STYLE_LAYERS_ATOM_ID]: buildUiStyleLayersAtom(),
    [UI_MOTION_ATOM_ID]: buildUiMotionAtom(),
    [UI_STYLE_RULES_ATOM_ID]: buildUiStyleRulesAtom(),
    [UI_CONDITIONAL_STYLES_ATOM_ID]: buildUiConditionalStylesAtom(),
    [UI_METRIC_BINDINGS_ATOM_ID]: buildUiMetricBindingsAtom(),
  };
}

export function getGeneratedFragment(id: string): string | undefined {
  const manifest = loadManifestFromDisk();
  return manifest?.fragments[id];
}

export function getAllGeneratedFragments(): Record<string, string> {
  const manifest = loadManifestFromDisk();
  if (manifest) {
    return { ...manifest.fragments };
  }
  return {};
}

export function getModelFragments(): Record<string, string> {
  const manifest = loadManifestFromDisk();
  if (!manifest) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(manifest.fragments).filter(([id]) =>
      id.startsWith("model."),
    ),
  );
}

export function getCombinedStaticFragments(): Record<string, string> {
  return {
    ...getStaticAtomFragments(),
    ...getAllGeneratedFragments(),
  };
}
