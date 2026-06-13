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
  buildUiDataSourcesAtom,
  buildUiLayoutBaseAtom,
  buildUiStyleRulesAtom,
  UI_DATA_SOURCES_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
} from "../packages/ai-context/src/atoms/ui/layout-document.js";
import { buildAllGeneratedFragments } from "../packages/ai-context/src/generate/surface-variants.js";
import { buildAllModelFragments } from "../packages/ai-context/src/generate/model-schema.js";
import { hashSourceValue } from "../packages/ai-context/src/utils/hash.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = join(
  repoRoot,
  "packages/ai-context/src/generated",
);
const uiDir = join(generatedDir, "ui");
const modelDir = join(generatedDir, "model");

function main(): void {
  mkdirSync(uiDir, { recursive: true });
  mkdirSync(modelDir, { recursive: true });

  const staticAtoms = {
    [THEME_STYLE_RULES_ATOM_ID]: buildThemeStyleRulesAtom(),
    [THEME_LAYOUT_TOKENS_ATOM_ID]: buildThemeLayoutTokensAtom(),
    [UI_LAYOUT_BASE_ATOM_ID]: buildUiLayoutBaseAtom(),
    [UI_STYLE_RULES_ATOM_ID]: buildUiStyleRulesAtom(),
    [UI_DATA_SOURCES_ATOM_ID]: buildUiDataSourcesAtom(),
  };

  const uiGenerated = buildAllGeneratedFragments();
  const modelGenerated = buildAllModelFragments();
  const generated = { ...uiGenerated, ...modelGenerated };
  const fragments = { ...staticAtoms, ...generated };

  for (const [id, content] of Object.entries(uiGenerated)) {
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

  console.log(
    `Generated ${Object.keys(uiGenerated).length} UI + ${Object.keys(modelGenerated).length} model fragments (hash: ${versionHash}).`,
  );
}

main();
