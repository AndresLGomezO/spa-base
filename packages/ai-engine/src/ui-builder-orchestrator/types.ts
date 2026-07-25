import type { DesignLayoutSurface } from "@repo/entities";
import type {
  FieldPathValidationDefinition,
  UiComponentConfig,
  UiComponentKind,
} from "@repo/ui-builder-core";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";

import type { OrchestratorProgress } from "./progress.js";

export type ListViewTypeChoice = "card" | "expandableTable";

export interface ExpandableColumnMeta {
  readonly id: string;
  readonly label?: string;
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
  readonly summaryField?: string;
}

export interface SkeletonComponentSpec {
  readonly kind: UiComponentKind | "grid" | "nested-layout";
  readonly fieldPath?: string;
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
  readonly trackCount?: number;
  readonly columnCount?: number;
  readonly tracks?: readonly {
    readonly components: readonly SkeletonComponentSpec[];
  }[];
  /** @deprecated Legacy AI output — normalized to tracks */
  readonly columns?: readonly {
    readonly components: readonly SkeletonComponentSpec[];
  }[];
}

export interface LayoutTargetDraft {
  readonly pathKey: string;
  readonly label: string;
  readonly skeleton?: readonly SkeletonComponentSpec[];
  readonly componentConfigs: Readonly<Record<string, UiComponentConfig>>;
}

import type { FormBlueprint } from "./surfaces/forms/forms-blueprint.schema.js";

export type FormPresentationChoice = "plain" | "wizard";

export interface WizardStepMeta {
  readonly id: string;
  readonly label: string;
  readonly fieldPaths?: readonly string[];
  readonly helperKind?: "info-box" | "callout-warning";
  readonly helperText?: string;
  readonly readOnly?: boolean;
}

export interface ListUiBuilderDraft {
  readonly surface: "list";
  readonly entityName: string;
  readonly userPrompt: string;
  readonly currentLayoutJson?: string;
  readonly listViewType?: ListViewTypeChoice;
  readonly table?: {
    readonly fields: readonly string[];
    readonly showActions?: boolean;
  };
  readonly expandableColumns?: readonly ExpandableColumnMeta[];
  readonly showActions?: boolean;
  readonly layoutTargets: Readonly<Record<string, LayoutTargetDraft>>;
  readonly completedStepIds: readonly string[];
}

export interface FormsUiBuilderDraft {
  readonly surface: "forms";
  readonly entityName: string;
  readonly userPrompt: string;
  readonly currentLayoutJson?: string;
  readonly presentation?: FormPresentationChoice;
  readonly creativeMode?: boolean;
  readonly formBlueprint?: FormBlueprint;
  readonly blueprintVisualTheme?: string;
  readonly wizardProgressVariant?: "steps" | "bar" | "stepper";
  readonly wizardSteps?: readonly WizardStepMeta[];
  readonly layoutTargets: Readonly<Record<string, LayoutTargetDraft>>;
  readonly completedStepIds: readonly string[];
}

export type UiBuilderDraft = ListUiBuilderDraft | FormsUiBuilderDraft;

export interface UiBuilderDraftWithLayoutTargets {
  readonly layoutTargets: Readonly<Record<string, LayoutTargetDraft>>;
}

export interface UiBuilderStep {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly phase: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface StepContextInput {
  readonly systemInstruction: string;
  readonly contextBlocks: readonly {
    readonly id: string;
    readonly content: string;
  }[];
  readonly userText: string;
  readonly outputInstruction: string;
}

export type StepValidationResult =
  | {
      readonly ok: true;
      readonly data: unknown;
      readonly draftPatch?: Partial<UiBuilderDraft>;
      readonly appendSteps?: readonly UiBuilderStep[];
    }
  | {
      readonly ok: false;
      readonly errors: readonly string[];
    };

export interface SurfaceRecipeContext {
  readonly surface: DesignLayoutSurface;
  readonly draft: UiBuilderDraft;
  readonly entityFieldPaths: readonly string[];
  readonly fieldPathDefinition: FieldPathValidationDefinition;
  readonly layoutFieldPaths: readonly string[];
  readonly tableFieldPaths: readonly string[];
  readonly formFieldPaths: readonly string[];
  readonly formPresentation?: FormPresentationChoice;
  readonly presentationHint?: FormPresentationChoice;
  readonly allowCreative?: boolean;
  readonly themeFragments: Record<string, string>;
  readonly entityTenantFragment: string;
  readonly entityCatalogFragment: string;
  readonly entityCurrentFragment: string;
  readonly userPrompt: string;
}

export interface SurfaceRecipe {
  readonly surface: DesignLayoutSurface;
  createInitialSteps(context: SurfaceRecipeContext): readonly UiBuilderStep[];
  buildStepContext(
    step: UiBuilderStep,
    context: SurfaceRecipeContext,
  ): StepContextInput;
  validateStepOutput(
    step: UiBuilderStep,
    rawOutput: unknown,
    context: SurfaceRecipeContext,
  ): StepValidationResult;
  mergeStepIntoDraft(
    step: UiBuilderStep,
    data: unknown,
    draft: UiBuilderDraft,
    appendSteps?: readonly UiBuilderStep[],
  ): UiBuilderDraft;
  assembleFinalOutput(
    draft: UiBuilderDraft,
    context: SurfaceRecipeContext,
  ): unknown;
  appendStepsAfterMerge(
    step: UiBuilderStep,
    draft: UiBuilderDraft,
    validationAppendSteps: readonly UiBuilderStep[],
  ): readonly UiBuilderStep[];
}

export interface OrchestratorCallbacks {
  readonly onProgress: (progress: OrchestratorProgress) => Promise<void>;
  readonly onDraftUpdate: (draft: UiBuilderDraft) => Promise<void>;
  readonly onStepTrace?: (
    entry: import("../schemas/ai-job.schema.js").AiJobStepTraceEntry,
  ) => Promise<void>;
  readonly onStepMerged?: (
    stepId: string,
    draftAfter: UiBuilderDraft,
  ) => Promise<void>;
}

export interface OrchestratorResult {
  readonly output: { readonly summary: string; readonly stepCount: number };
  readonly draft: UiBuilderDraft;
}

export interface RunOrchestratorOptions {
  readonly vertexConfig: import("../vertex-ai.client.js").VertexAiConfig;
  readonly recipe: SurfaceRecipe;
  readonly context: SurfaceRecipeContext;
  readonly callbacks: OrchestratorCallbacks;
  readonly initialSteps?: readonly UiBuilderStep[];
  readonly generateAnswer?: import("./step-runner.js").GenerateAnswerFn;
}
