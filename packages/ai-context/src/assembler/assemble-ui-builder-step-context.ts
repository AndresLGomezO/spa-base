import {
  UI_BUILDER_SYSTEM_INSTRUCTION,
  type AiContextBlock,
} from "../assembler/assemble-ui-builder-context.js";
import {
  buildUiSchemaContext,
  type FormPresentation,
  type ListViewType,
} from "../builders/build-ui-schema-context.js";
import { ENTITY_CURRENT_FRAGMENT_ID } from "../builders/build-entity-context.js";
import {
  THEME_LAYOUT_TOKENS_ATOM_ID,
  THEME_STYLE_RULES_ATOM_ID,
} from "../atoms/theme/style-rules.js";
import {
  UI_DATA_SOURCES_ATOM_ID,
  UI_LAYOUT_BASE_ATOM_ID,
  UI_STYLE_RULES_ATOM_ID,
} from "../atoms/ui/layout-document.js";
import { UI_LABEL_CONFIG_ATOM_ID } from "../atoms/ui/label-config.js";
import { UI_CONDITIONAL_STYLES_ATOM_ID } from "../atoms/ui/conditional-styles.js";
import { UI_RESPONSIVE_VISIBILITY_ATOM_ID } from "../atoms/ui/responsive-visibility.js";
import {
  FORMS_PRESENTATION_SELECTION_FRAGMENT_ID,
  FORMS_PRESENTATION_SELECTION_GUIDANCE,
} from "../atoms/ui/forms-presentation-selection.js";
import {
  FORMS_BLUEPRINT_GUIDANCE,
  FORMS_BLUEPRINT_GUIDANCE_FRAGMENT_ID,
} from "../atoms/ui/forms-blueprint-guidance.js";
import { FORMS_BLUEPRINT_SYSTEM_INSTRUCTION } from "../atoms/ui/forms-blueprint-system.js";
import { FORMS_STRICT_SYSTEM_INSTRUCTION } from "../atoms/ui/forms-strict-system.js";
import {
  FORMS_CONTRACT_WIZARD_EXCERPT,
  FORMS_CONTRACT_WIZARD_EXCERPT_FRAGMENT_ID,
  FORMS_DESIGN_EXCELLENCE_FRAGMENT_ID,
  FORMS_DESIGN_EXCELLENCE_GUIDANCE,
} from "../atoms/ui/forms-design-excellence.js";
import {
  LIST_DESIGN_EXCELLENCE_FRAGMENT_ID,
  LIST_DESIGN_EXCELLENCE_GUIDANCE,
} from "../atoms/ui/list-design-excellence.js";
import {
  LIST_PRESENTATION_SELECTION_FRAGMENT_ID,
  LIST_PRESENTATION_SELECTION_GUIDANCE,
} from "../atoms/ui/list-presentation-selection.js";
import { componentAtomId } from "../generate/component-descriptions.js";
import { getCombinedStaticFragments } from "../generated/load-generated.js";
import { estimateTokenCount } from "../utils/hash.js";

const LIST_FRAGMENT_BY_TYPE: Record<ListViewType, string> = {
  card: "ui.surface.list.card",
  expandableTable: "ui.surface.list.expandableTable",
};

const FORM_FRAGMENT_BY_PRESENTATION: Record<FormPresentation, string> = {
  plain: "ui.surface.forms.plain",
  wizard: "ui.surface.forms.wizard",
};

const LIST_STEP_TYPES = {
  SELECT_VIEW_TYPE: "list.selectViewType",
  TABLE_SELECT_FIELDS: "list.tableSelectFields",
  EXPANDABLE_DEFINE_COLUMNS: "list.expandableDefineColumns",
  LAYOUT_SKELETON: "list.layoutSkeleton",
  CONFIGURE_COMPONENT: "list.configureComponent",
} as const;

const FORMS_STEP_TYPES = {
  SELECT_PRESENTATION: "forms.selectPresentation",
  GENERATE_BLUEPRINT: "forms.generateBlueprint",
  DEFINE_WIZARD_STEPS: "forms.defineWizardSteps",
  ALLOCATE_FIELDS_TO_STEPS: "forms.allocateFieldsToSteps",
  LAYOUT_SKELETON: "forms.layoutSkeleton",
  CONFIGURE_COMPONENT: "forms.configureComponent",
} as const;

export interface UiBuilderStepContextRequest {
  readonly stepType: string;
  readonly listViewType?: ListViewType;
  readonly formPresentation?: FormPresentation;
  readonly presentationHint?: FormPresentation;
  readonly componentKind?: string;
  readonly hierarchyContext?: string;
  readonly allowedLayoutFieldPaths?: readonly string[];
  readonly allowedTableFieldPaths?: readonly string[];
  readonly allowedFormFieldPaths?: readonly string[];
  readonly formBlueprintJson?: string;
  readonly definedWizardStepsJson?: string;
  readonly taskDescription: string;
  readonly entityTenantFragment: string;
  readonly entityCatalogFragment: string;
  readonly entityCurrentFragment: string;
  readonly themeFragments: Record<string, string>;
  readonly userPrompt: string;
}

export interface AssembledUiBuilderStepContext {
  readonly systemInstruction: string;
  readonly contextBlocks: readonly AiContextBlock[];
  readonly userText: string;
  readonly estimatedTokens: number;
}

function listSurfaceFragmentId(listViewType: ListViewType): string {
  return LIST_FRAGMENT_BY_TYPE[listViewType];
}

function isListStep(stepType: string): boolean {
  return stepType.startsWith("list.");
}

function isFormsStep(stepType: string): boolean {
  return stepType.startsWith("forms.");
}

function includesLayoutBase(stepType: string): boolean {
  return (
    stepType === LIST_STEP_TYPES.LAYOUT_SKELETON ||
    stepType === LIST_STEP_TYPES.CONFIGURE_COMPONENT ||
    stepType === FORMS_STEP_TYPES.LAYOUT_SKELETON ||
    stepType === FORMS_STEP_TYPES.CONFIGURE_COMPONENT
  );
}

function includesResponsiveVisibility(stepType: string): boolean {
  return (
    stepType !== LIST_STEP_TYPES.SELECT_VIEW_TYPE &&
    stepType !== FORMS_STEP_TYPES.SELECT_PRESENTATION
  );
}

function includesTheme(stepType: string): boolean {
  if (stepType === FORMS_STEP_TYPES.CONFIGURE_COMPONENT) {
    return true;
  }
  return stepType === LIST_STEP_TYPES.CONFIGURE_COMPONENT;
}

function includesListSurfaceFragment(stepType: string): boolean {
  return (
    stepType === LIST_STEP_TYPES.TABLE_SELECT_FIELDS ||
    stepType === LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS ||
    stepType === LIST_STEP_TYPES.LAYOUT_SKELETON
  );
}

function includesFormsSurfaceFragment(stepType: string): boolean {
  return (
    stepType === FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS ||
    stepType === FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS ||
    stepType === FORMS_STEP_TYPES.LAYOUT_SKELETON
  );
}

function includesVisualDesignGuidance(
  stepType: string,
  listViewType?: ListViewType,
): boolean {
  if (
    stepType !== LIST_STEP_TYPES.LAYOUT_SKELETON &&
    stepType !== LIST_STEP_TYPES.CONFIGURE_COMPONENT
  ) {
    return false;
  }

  return listViewType === "card" || listViewType === "expandableTable";
}

function includesStylingFragments(stepType: string): boolean {
  if (stepType === FORMS_STEP_TYPES.CONFIGURE_COMPONENT) {
    return true;
  }
  return stepType === LIST_STEP_TYPES.CONFIGURE_COMPONENT;
}

const FORMS_MINIMAL_CONFIGURE_KINDS = new Set<string>();

function includesComponentAtom(
  stepType: string,
  componentKind?: string,
): boolean {
  if (!componentKind || componentKind === "nested-layout") {
    return false;
  }
  if (
    stepType === FORMS_STEP_TYPES.CONFIGURE_COMPONENT &&
    FORMS_MINIMAL_CONFIGURE_KINDS.has(componentKind)
  ) {
    return false;
  }
  return true;
}

function includesFormsDesignExcellence(stepType: string): boolean {
  return (
    stepType === FORMS_STEP_TYPES.SELECT_PRESENTATION ||
    stepType === FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS ||
    stepType === FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS ||
    stepType === FORMS_STEP_TYPES.LAYOUT_SKELETON ||
    stepType === FORMS_STEP_TYPES.CONFIGURE_COMPONENT
  );
}

function usesFormsStrictSystemInstruction(stepType: string): boolean {
  return (
    stepType === FORMS_STEP_TYPES.LAYOUT_SKELETON ||
    stepType === FORMS_STEP_TYPES.CONFIGURE_COMPONENT
  );
}

function resolveStepSystemInstruction(
  stepType: string,
  listViewType?: ListViewType,
): string {
  const suffix = stepSystemInstructionSuffix(stepType, listViewType);

  if (stepType === FORMS_STEP_TYPES.GENERATE_BLUEPRINT) {
    return `${FORMS_BLUEPRINT_SYSTEM_INSTRUCTION}\n\n${suffix}`;
  }

  if (usesFormsStrictSystemInstruction(stepType)) {
    return `${FORMS_STRICT_SYSTEM_INSTRUCTION}\n\n${suffix}`;
  }

  return `${UI_BUILDER_SYSTEM_INSTRUCTION}\n\n${suffix}`;
}

function stepSystemInstructionSuffix(
  stepType: string,
  listViewType?: ListViewType,
): string {
  const base =
    "Return ONLY a single compact JSON object for the current step. No markdown, no commentary.";

  if (includesVisualDesignGuidance(stepType, listViewType)) {
    return `${base} Be visually ambitious: prefer image/icon anchors, mixed component kinds, theme colors, and styling props — avoid plain text-only output.`;
  }

  if (includesFormsDesignExcellence(stepType)) {
    return `${base} Prefer grouped wizard fields, form-section intros, styled static callouts, and an appropriate wizard-progress variant (steps, bar, or stepper) when fields are numerous.`;
  }

  return base;
}

export function assembleUiBuilderStepContext(
  request: UiBuilderStepContextRequest,
): AssembledUiBuilderStepContext {
  const staticFragments = getCombinedStaticFragments();
  const blocks: AiContextBlock[] = [];

  const pushIf = (id: string) => {
    const content = staticFragments[id];
    if (content) {
      blocks.push({ id, content });
    }
  };

  if (includesLayoutBase(request.stepType)) {
    pushIf(UI_LAYOUT_BASE_ATOM_ID);
  }

  if (includesResponsiveVisibility(request.stepType)) {
    pushIf(UI_RESPONSIVE_VISIBILITY_ATOM_ID);
  }

  if (request.stepType === LIST_STEP_TYPES.SELECT_VIEW_TYPE) {
    blocks.push({
      id: LIST_PRESENTATION_SELECTION_FRAGMENT_ID,
      content: LIST_PRESENTATION_SELECTION_GUIDANCE,
    });
  } else if (request.stepType === FORMS_STEP_TYPES.SELECT_PRESENTATION) {
    blocks.push({
      id: FORMS_PRESENTATION_SELECTION_FRAGMENT_ID,
      content: FORMS_PRESENTATION_SELECTION_GUIDANCE,
    });
  } else if (request.stepType === FORMS_STEP_TYPES.GENERATE_BLUEPRINT) {
    blocks.push({
      id: FORMS_BLUEPRINT_GUIDANCE_FRAGMENT_ID,
      content: FORMS_BLUEPRINT_GUIDANCE,
    });
  } else if (
    request.listViewType &&
    isListStep(request.stepType) &&
    includesListSurfaceFragment(request.stepType)
  ) {
    const scopeFragments = buildUiSchemaContext({
      surface: "list",
      listViewType: request.listViewType,
    });
    const surfaceId = listSurfaceFragmentId(request.listViewType);
    if (scopeFragments[surfaceId]) {
      blocks.push({ id: surfaceId, content: scopeFragments[surfaceId]! });
    }
  } else if (
    request.formPresentation &&
    isFormsStep(request.stepType) &&
    includesFormsSurfaceFragment(request.stepType)
  ) {
    const scopeFragments = buildUiSchemaContext({
      surface: "forms",
      formPresentation: request.formPresentation,
    });
    const surfaceId = FORM_FRAGMENT_BY_PRESENTATION[request.formPresentation];
    if (scopeFragments[surfaceId]) {
      blocks.push({ id: surfaceId, content: scopeFragments[surfaceId]! });
    }
  }

  if (includesComponentAtom(request.stepType, request.componentKind)) {
    const componentId = componentAtomId(
      request.componentKind as Parameters<typeof componentAtomId>[0],
    );
    pushIf(componentId);
  }

  if (includesTheme(request.stepType)) {
    pushIf(THEME_STYLE_RULES_ATOM_ID);
    pushIf(THEME_LAYOUT_TOKENS_ATOM_ID);
    for (const [id, content] of Object.entries(request.themeFragments)) {
      if (id.startsWith("theme.")) {
        blocks.push({ id, content });
      }
    }
  }

  if (includesStylingFragments(request.stepType)) {
    pushIf(UI_STYLE_RULES_ATOM_ID);
    pushIf(UI_CONDITIONAL_STYLES_ATOM_ID);
    pushIf(UI_LABEL_CONFIG_ATOM_ID);
    pushIf(UI_DATA_SOURCES_ATOM_ID);
  }

  if (includesVisualDesignGuidance(request.stepType, request.listViewType)) {
    blocks.push({
      id: LIST_DESIGN_EXCELLENCE_FRAGMENT_ID,
      content: LIST_DESIGN_EXCELLENCE_GUIDANCE,
    });
  }

  if (includesFormsDesignExcellence(request.stepType)) {
    blocks.push({
      id: FORMS_DESIGN_EXCELLENCE_FRAGMENT_ID,
      content: FORMS_DESIGN_EXCELLENCE_GUIDANCE,
    });
    if (
      request.formPresentation === "wizard" ||
      request.presentationHint === "wizard"
    ) {
      blocks.push({
        id: FORMS_CONTRACT_WIZARD_EXCERPT_FRAGMENT_ID,
        content: FORMS_CONTRACT_WIZARD_EXCERPT,
      });
    }
  }

  blocks.push({
    id: ENTITY_CURRENT_FRAGMENT_ID,
    content: request.entityCurrentFragment,
  });

  if (request.hierarchyContext?.trim()) {
    blocks.push({
      id: "step.hierarchy",
      content: `# Working context\n\n${request.hierarchyContext.trim()}`,
    });
  }

  if (
    request.allowedLayoutFieldPaths &&
    request.allowedLayoutFieldPaths.length > 0
  ) {
    blocks.push({
      id: "step.allowedFieldPaths",
      content: `# Allowed layout field paths\n\n${request.allowedLayoutFieldPaths.map((path) => `- \`${path}\``).join("\n")}`,
    });
  }

  if (
    request.allowedTableFieldPaths &&
    request.allowedTableFieldPaths.length > 0
  ) {
    blocks.push({
      id: "step.allowedTableFieldPaths",
      content: `# Allowed table column field paths\n\n${request.allowedTableFieldPaths.map((path) => `- \`${path}\``).join("\n")}`,
    });
  }

  if (
    request.allowedFormFieldPaths &&
    request.allowedFormFieldPaths.length > 0
  ) {
    blocks.push({
      id: "step.allowedFormFieldPaths",
      content: `# Allowed form field paths\n\n${request.allowedFormFieldPaths.map((path) => `- \`${path}\``).join("\n")}`,
    });
  }

  if (request.formBlueprintJson?.trim()) {
    blocks.push({
      id: "step.formBlueprint",
      content: `# Approved form blueprint\n\n${request.formBlueprintJson.trim()}`,
    });
  }

  if (request.definedWizardStepsJson?.trim()) {
    blocks.push({
      id: "step.definedWizardSteps",
      content: `# Defined wizard steps (use these exact ids)\n\n${request.definedWizardStepsJson.trim()}`,
    });
  }

  blocks.push({
    id: "step.task",
    content: `# Current task\n\n${request.taskDescription.trim()}`,
  });

  blocks.push({
    id: "user.prompt",
    content: `# User request\n\n${request.userPrompt.trim()}${
      request.presentationHint
        ? `\n\nDesigner presentation hint: **${request.presentationHint}** (hint only when field count allows selection).`
        : ""
    }`,
  });

  const userText = request.userPrompt.trim();
  const systemInstruction = resolveStepSystemInstruction(
    request.stepType,
    request.listViewType,
  );
  const estimatedTokens = blocks.reduce(
    (total, block) => total + estimateTokenCount(block.content),
    estimateTokenCount(systemInstruction),
  );

  return {
    systemInstruction,
    contextBlocks: blocks,
    userText,
    estimatedTokens,
  };
}
