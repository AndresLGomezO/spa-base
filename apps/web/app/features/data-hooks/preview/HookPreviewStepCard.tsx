import {
  Bell,
  ChevronDown,
  Filter,
  GitBranch,
  ListOrdered,
  Repeat,
  Sigma,
  Zap,
} from "lucide-react";
import { Text } from "@repo/ui";

import { FormulaDefinitionInfoButton } from "../../formulas/FormulaDefinitionInfoButton";
import type { HookPreviewStep } from "./hook-preview-types.js";
import { HookPreviewWidgets } from "./HookPreviewWidgets.js";

const ICONS = {
  trigger: Zap,
  condition: Filter,
  action: ListOrdered,
  notification: Bell,
  loop: Repeat,
  aggregate: Sigma,
  meta: GitBranch,
} as const;

interface HookPreviewStepCardProps {
  readonly step: HookPreviewStep;
  readonly mode: "overview" | "details" | "advanced";
  readonly showConnector?: boolean;
}

export function HookPreviewStepCard({
  step,
  mode,
  showConnector = false,
}: HookPreviewStepCardProps) {
  const Icon = ICONS[step.icon];

  const bullets =
    mode === "overview"
      ? step.bullets
      : [
          ...(step.bullets ?? []),
          ...(step.details?.flatMap((d) => d.bullets ?? []) ?? []),
        ];

  const widgets = [
    ...(step.widgets ?? []),
    ...(step.details?.flatMap((d) => d.widgets ?? []) ?? []),
  ];

  const advancedExpressions =
    mode === "advanced" ? step.advancedExpressions : undefined;

  const formulaNames = step.formulaNames ?? [];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="border-border bg-card w-full rounded-lg border p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon aria-hidden className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Text className="text-foreground text-sm font-semibold">
                  {step.title}
                </Text>
                <Text className="text-muted-foreground mt-0.5 text-sm">
                  {step.summary}
                </Text>
              </div>
              {formulaNames.length > 0 ? (
                <div className="flex shrink-0 flex-wrap items-center gap-0.5">
                  {formulaNames.map((name) => (
                    <FormulaDefinitionInfoButton
                      key={name}
                      formulaName={name}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            {bullets && bullets.length > 0 ? (
              <ul className="space-y-1">
                {bullets.map((line) => (
                  <li
                    key={line}
                    className="text-foreground flex items-start gap-2 text-xs"
                  >
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {step.details && mode === "details"
              ? step.details.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <Text className="text-foreground text-xs font-medium">
                      {section.title}
                    </Text>
                    {section.bullets ? (
                      <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
                        {section.bullets.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              : null}
            <HookPreviewWidgets widgets={widgets} mode={mode} />
            {advancedExpressions && advancedExpressions.length > 0 ? (
              <div className="space-y-3">
                {advancedExpressions.map((entry) => (
                  <HookPreviewWidgets
                    key={entry.label}
                    mode="advanced"
                    widgets={[
                      {
                        type: "dsl",
                        label: entry.label,
                        expression: entry.expression,
                      },
                    ]}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {showConnector ? (
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 shrink-0"
        />
      ) : null}
    </div>
  );
}
