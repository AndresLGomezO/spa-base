import type {
  DataHookAction,
  DataHookConditionNode,
  DataHookExecutionMode,
  DataHookPhase,
  DataHookTrigger,
  ExpressionNode,
} from "@repo/hooks";

export type HookPreviewTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface HookPreviewBuildContext {
  readonly entityName: string;
  readonly entityLabel: (name: string) => string;
  readonly fieldLabel: (entityName: string, fieldPath: string) => string;
  readonly t: HookPreviewTranslate;
}

export interface HookPreviewInput {
  readonly name: string;
  readonly description?: string;
  readonly entity: string;
  readonly phase: DataHookPhase;
  readonly trigger: DataHookTrigger;
  readonly condition: DataHookConditionNode | null;
  readonly actions: readonly DataHookAction[];
  readonly chainHooks?: boolean;
  readonly execution?: DataHookExecutionMode;
  readonly enabled?: boolean;
}

export type HookPreviewStepIcon =
  | "trigger"
  | "condition"
  | "action"
  | "notification"
  | "loop"
  | "aggregate"
  | "meta";

export type HookPreviewStepKind = "trigger" | "condition" | "action" | "meta";

export type HookPreviewWidget =
  | { readonly type: "frequencyTable" }
  | {
      readonly type: "rowCountRules";
      readonly ruleKey: "initial" | "extension";
    }
  | {
      readonly type: "loopExample";
      readonly fields: readonly {
        readonly label: string;
        readonly value: string;
      }[];
    }
  | { readonly type: "bulletList"; readonly items: readonly string[] }
  | {
      readonly type: "dsl";
      readonly label: string;
      readonly expression: ExpressionNode;
    };

export interface HookPreviewDetailSection {
  readonly title: string;
  readonly bullets?: readonly string[];
  readonly widgets?: readonly HookPreviewWidget[];
}

export interface HookPreviewStep {
  readonly id: string;
  readonly kind: HookPreviewStepKind;
  readonly icon: HookPreviewStepIcon;
  readonly title: string;
  readonly summary: string;
  readonly bullets?: readonly string[];
  readonly details?: readonly HookPreviewDetailSection[];
  readonly widgets?: readonly HookPreviewWidget[];
  readonly formulaNames?: readonly string[];
  readonly advancedExpressions?: readonly {
    readonly label: string;
    readonly expression: ExpressionNode;
  }[];
}

export interface HookPreviewModel {
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly HookPreviewStep[];
  readonly metaChips: readonly string[];
}

export interface ActionPipelineState {
  readonly loadedAliases: ReadonlyMap<string, string>;
  readonly aggregateAliases: ReadonlySet<string>;
}
