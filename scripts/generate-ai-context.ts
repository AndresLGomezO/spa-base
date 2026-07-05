/**
 * Regenerates AI context fragments from UI builder schema sources.
 *
 * Usage:
 *   pnpm generate:ai-context
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildThemeLayoutTokensAtom,
  buildThemeStyleRulesAtom,
  THEME_LAYOUT_TOKENS_ATOM_ID,
  THEME_STYLE_RULES_ATOM_ID,
} from "../packages/ai-context/src/atoms/theme/style-rules.js";
import {
  buildUiDesignHandbookRouterAtom,
  UI_DESIGN_HANDBOOK_ROUTER_ATOM_ID,
} from "../packages/ai-context/src/atoms/ui/design-handbook-router.js";
import {
  buildUiImportScopesAtom,
  UI_IMPORT_SCOPES_ATOM_ID,
} from "../packages/ai-context/src/atoms/ui/import-scopes.js";
import {
  buildUiDataSourcesAtom,
  buildUiLayoutBaseAtom,
  buildUiStyleRulesAtom,
  UI_DATA_SOURCES_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
} from "../packages/ai-context/src/atoms/ui/layout-document.js";
import {
  buildUiPersistenceKeysAtom,
  UI_PERSISTENCE_KEYS_ATOM_ID,
} from "../packages/ai-context/src/atoms/ui/persistence-keys.js";
import {
  buildUiPresetsPlatformAtom,
  UI_PRESETS_PLATFORM_ATOM_ID,
} from "../packages/ai-context/src/atoms/ui/platform-presets.js";
import { buildAllGeneratedFragments } from "../packages/ai-context/src/generate/surface-variants.js";
import { buildAllModelFragments } from "../packages/ai-context/src/generate/model-schema.js";
import { buildManualRecipeFragments } from "../packages/ai-context/src/generate/manual-recipes.js";
import { hashSourceValue } from "../packages/ai-context/src/utils/hash.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = join(
  repoRoot,
  "packages/ai-context/src/generated",
);
const uiDir = join(generatedDir, "ui");
const modelDir = join(generatedDir, "model");
const recipesDir = join(repoRoot, "docs/ui-design-manual/07-recipes");

function main(): void {
  mkdirSync(uiDir, { recursive: true });
  mkdirSync(modelDir, { recursive: true });

  const staticAtoms = {
    [THEME_STYLE_RULES_ATOM_ID]: buildThemeStyleRulesAtom(),
    [THEME_LAYOUT_TOKENS_ATOM_ID]: buildThemeLayoutTokensAtom(),
    [UI_LAYOUT_BASE_ATOM_ID]: buildUiLayoutBaseAtom(),
    [UI_STYLE_RULES_ATOM_ID]: buildUiStyleRulesAtom(),
    [UI_DATA_SOURCES_ATOM_ID]: buildUiDataSourcesAtom(),
    [UI_PRESETS_PLATFORM_ATOM_ID]: buildUiPresetsPlatformAtom(),
    [UI_IMPORT_SCOPES_ATOM_ID]: buildUiImportScopesAtom(),
    [UI_PERSISTENCE_KEYS_ATOM_ID]: buildUiPersistenceKeysAtom(),
    [UI_DESIGN_HANDBOOK_ROUTER_ATOM_ID]: buildUiDesignHandbookRouterAtom(),
  };

  const uiGenerated = buildAllGeneratedFragments();
  const modelGenerated = buildAllModelFragments();
  const recipeFragments = buildManualRecipeFragments(recipesDir);
  const generated = { ...uiGenerated, ...modelGenerated, ...recipeFragments };
  const fragments = { ...staticAtoms, ...generated };

  for (const [id, content] of Object.entries({
    ...uiGenerated,
    ...recipeFragments,
  })) {
    const fileName = `${id.replace(/\./g, "-")}.md`;
    writeFileSync(join(uiDir, fileName), content, "utf8");
  }

  for (const [id, content] of Object.entries(modelGenerated)) {
    const fileName = `${id.replace(/\./g, "-")}.md`;
    writeFileSync(join(modelDir, fileName), content, "utf8");
  }

  const versionHash = hashSourceValue(fragments);
  const manifest = {
    versionHash,
    fragments,
  };

  writeFileSync(
    join(generatedDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const recipeCount = Object.keys(recipeFragments).length;
  console.log(
    `Generated ${Object.keys(uiGenerated).length} UI + ${Object.keys(modelGenerated).length} model + ${recipeCount} recipe fragments (hash: ${versionHash}).`,
  );
}

main();
