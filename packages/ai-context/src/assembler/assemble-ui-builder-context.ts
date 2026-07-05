import type { DesignLayoutSurface } from "@repo/entities";

import {
  buildUiSchemaContext,
  type FormPresentation,
  type ListViewType,
} from "../builders/build-ui-schema-context.js";
import { THEME_TENANT_SNAPSHOT_FRAGMENT_ID } from "../builders/build-theme-context.js";
import {
  ENTITY_CATALOG_FRAGMENT_ID,
  ENTITY_CURRENT_FRAGMENT_ID,
  ENTITY_TENANT_FRAGMENT_ID,
} from "../builders/build-entity-context.js";
import {
  THEME_LAYOUT_TOKENS_ATOM_ID,
  THEME_STYLE_RULES_ATOM_ID,
} from "../atoms/theme/style-rules.js";
import {
  UI_DATA_SOURCES_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
} from "../atoms/ui/layout-document.js";
import { UI_CONDITIONAL_STYLES_ATOM_ID } from "../atoms/ui/conditional-styles.js";
import { UI_LABEL_CONFIG_ATOM_ID } from "../atoms/ui/label-config.js";
import { UI_METRIC_BINDINGS_ATOM_ID } from "../atoms/ui/metric-bindings.js";
import { UI_MOTION_ATOM_ID } from "../atoms/ui/motion.js";
import { UI_RESPONSIVE_VISIBILITY_ATOM_ID } from "../atoms/ui/responsive-visibility.js";
import { UI_STYLE_LAYERS_ATOM_ID } from "../atoms/ui/style-layers.js";
import {
  LIST_PRESENTATION_SELECTION_FRAGMENT_ID,
  LIST_PRESENTATION_SELECTION_GUIDANCE,
} from "../atoms/ui/list-presentation-selection.js";
import { UI_DESIGN_HANDBOOK_ROUTER_ATOM_ID } from "../atoms/ui/design-handbook-router.js";
import { UI_IMPORT_SCOPES_ATOM_ID } from "../atoms/ui/import-scopes.js";
import { UI_PERSISTENCE_KEYS_ATOM_ID } from "../atoms/ui/persistence-keys.js";
import { UI_PRESETS_PLATFORM_ATOM_ID } from "../atoms/ui/platform-presets.js";
import { getCombinedStaticFragments } from "../generated/load-generated.js";
import { estimateTokenCount, truncateText } from "../utils/hash.js";

export interface AiContextBlock {
  readonly id: string;
  readonly content: string;
}

export interface UiBuilderContextRequest {
  readonly tenantId: string;
  readonly entityName: string;
  readonly surface: DesignLayoutSurface;
  readonly listViewType?: ListViewType;
  readonly formPresentation?: FormPresentation;
  readonly currentLayoutJson?: string;
  readonly userPrompt: string;
}

export interface UiBuilderContextInput {
  readonly request: UiBuilderContextRequest;
  readonly themeFragments: Record<string, string>;
  readonly entityTenantFragment: string;
  readonly entityCatalogFragment: string;
  readonly entityCurrentFragment: string;
}

export interface AssembledUiBuilderContext {
  readonly systemInstruction: string;
  readonly contextBlocks: readonly AiContextBlock[];
  readonly estimatedTokens: number;
}

export const UI_BUILDER_SYSTEM_INSTRUCTION = `You are a principal product designer and UI layout architect for an enterprise entity management platform.
You design production-grade interfaces at the quality bar of leading SaaS products (Stripe, Linear, Notion, Shopify Admin) — visually distinctive, not generic CRUD admin screens.
Rules:
- Output valid JSON matching the provided schema fragments only.
- Use field paths from the entity context; never invent fields or use the entity name as a field path.
- Follow theme styling rules (ThemeToken for colors, pixels for spacing); prefer theme tokens, then semantic var(--color-*), then sparing custom hex accents.
- Design mobile-first; use displayFrom/displayTo and responsive grid for multiscreen layouts.
- Use grid component rows for multi-column content; set gridTemplateColumns and one child row per track.
- **Visual-first:** when image/file/logo fields exist, lead with an image component; otherwise anchor with icon + bold title. Avoid flat text-only cards.
- **Colorful & polished:** use badge conditionalStyles for status fields, styles for typography hierarchy, and intentional whitespace — make layouts feel premium and industry-leading.
- Use labels, static fallbacks, and conditional badge/text styles where they improve clarity.
- Do not expose or bind sensitive field values.
- For list surface, select the single best presentation type (table, card, or expandableTable) for the entity and user goals before designing layout JSON. Prefer card when records benefit from rich visual hierarchy, badges, or images.
- Be concise in JSON shape; express creativity through component choice, layout structure, and styling — not prose.`;

const ASSEMBLY_ORDER = [
  UI_DESIGN_HANDBOOK_ROUTER_ATOM_ID,
  UI_PRESETS_PLATFORM_ATOM_ID,
  UI_IMPORT_SCOPES_ATOM_ID,
  UI_PERSISTENCE_KEYS_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_RESPONSIVE_VISIBILITY_ATOM_ID,
  UI_DATA_SOURCES_ATOM_ID,
  UI_LABEL_CONFIG_ATOM_ID,
  UI_STYLE_LAYERS_ATOM_ID,
  UI_MOTION_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
  UI_CONDITIONAL_STYLES_ATOM_ID,
  UI_METRIC_BINDINGS_ATOM_ID,
  "ui.surface.",
  LIST_PRESENTATION_SELECTION_FRAGMENT_ID,
  "ui.components.",
  THEME_STYLE_RULES_ATOM_ID,
  THEME_LAYOUT_TOKENS_ATOM_ID,
  THEME_TENANT_SNAPSHOT_FRAGMENT_ID,
  ENTITY_TENANT_FRAGMENT_ID,
  ENTITY_CATALOG_FRAGMENT_ID,
  ENTITY_CURRENT_FRAGMENT_ID,
  "current.layout",
  "user.prompt",
] as const;

function sortBlockId(a: string, b: string): number {
  const indexA = ASSEMBLY_ORDER.findIndex((prefix) => a.startsWith(prefix));
  const indexB = ASSEMBLY_ORDER.findIndex((prefix) => b.startsWith(prefix));
  const rankA = indexA === -1 ? ASSEMBLY_ORDER.length : indexA;
  const rankB = indexB === -1 ? ASSEMBLY_ORDER.length : indexB;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return a.localeCompare(b);
}

export function assembleUiBuilderContext(
  input: UiBuilderContextInput,
): AssembledUiBuilderContext {
  const { request } = input;
  const uiSchemaFragments = buildUiSchemaContext({
    surface: request.surface,
    ...(request.listViewType ? { listViewType: request.listViewType } : {}),
    ...(request.formPresentation
      ? { formPresentation: request.formPresentation }
      : {}),
  });

  const staticHandbookFragments = getCombinedStaticFragments();
  const handbookIds = [
    UI_DESIGN_HANDBOOK_ROUTER_ATOM_ID,
    UI_PRESETS_PLATFORM_ATOM_ID,
    UI_IMPORT_SCOPES_ATOM_ID,
    UI_PERSISTENCE_KEYS_ATOM_ID,
  ] as const;

  const blocks: AiContextBlock[] = [];

  for (const id of handbookIds) {
    const content = staticHandbookFragments[id];
    if (content) {
      blocks.push({ id, content });
    }
  }

  for (const [id, content] of Object.entries(uiSchemaFragments)) {
    blocks.push({ id, content });
  }

  if (request.surface === "list" && !request.listViewType) {
    blocks.push({
      id: LIST_PRESENTATION_SELECTION_FRAGMENT_ID,
      content: LIST_PRESENTATION_SELECTION_GUIDANCE,
    });
  }

  for (const [id, content] of Object.entries(input.themeFragments)) {
    blocks.push({ id, content });
  }

  blocks.push({
    id: ENTITY_TENANT_FRAGMENT_ID,
    content: input.entityTenantFragment,
  });
  blocks.push({
    id: ENTITY_CATALOG_FRAGMENT_ID,
    content: input.entityCatalogFragment,
  });
  blocks.push({
    id: ENTITY_CURRENT_FRAGMENT_ID,
    content: input.entityCurrentFragment,
  });

  if (request.currentLayoutJson?.trim()) {
    blocks.push({
      id: "current.layout",
      content: `# Current layout JSON\n\n\`\`\`json\n${truncateText(request.currentLayoutJson.trim(), 12000)}\n\`\`\``,
    });
  }

  blocks.push({
    id: "user.prompt",
    content: `# User request\n\n${request.userPrompt.trim()}`,
  });

  blocks.sort((a, b) => sortBlockId(a.id, b.id));

  const estimatedTokens = blocks.reduce(
    (total, block) => total + estimateTokenCount(block.content),
    estimateTokenCount(UI_BUILDER_SYSTEM_INSTRUCTION),
  );

  return {
    systemInstruction: UI_BUILDER_SYSTEM_INSTRUCTION,
    contextBlocks: blocks,
    estimatedTokens,
  };
}
