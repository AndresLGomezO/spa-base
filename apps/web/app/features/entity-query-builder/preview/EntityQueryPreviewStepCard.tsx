import {
  ArrowUpDown,
  ChevronDown,
  Database,
  Filter,
  Layers,
  List,
  Sigma,
  SlidersHorizontal,
} from "lucide-react";
import { Text } from "@repo/ui";

import type { EntityQueryPreviewStep } from "./entity-query-preview-types.js";

const ICONS = {
  source: Database,
  filter: Filter,
  parameters: SlidersHorizontal,
  sort: ArrowUpDown,
  select: List,
  limit: Layers,
  groupBy: List,
  aggregations: Sigma,
  groupSort: ArrowUpDown,
  groupLimit: Layers,
  output: Layers,
} as const;

interface EntityQueryPreviewStepCardProps {
  readonly step: EntityQueryPreviewStep;
  readonly mode: "overview" | "details" | "advanced";
  readonly showConnector?: boolean;
}

export function EntityQueryPreviewStepCard({
  step,
  mode,
  showConnector = false,
}: EntityQueryPreviewStepCardProps) {
  const Icon = ICONS[step.icon];

  const bullets =
    mode === "overview"
      ? step.bullets
      : [
          ...(step.bullets ?? []),
          ...(step.details?.flatMap((section) => section.bullets ?? []) ?? []),
        ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="border-border bg-card w-full rounded-lg border p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon aria-hidden className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <Text className="text-foreground text-sm font-semibold">
                {step.title}
              </Text>
              <Text className="text-muted-foreground mt-0.5 text-sm">
                {step.summary}
              </Text>
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
