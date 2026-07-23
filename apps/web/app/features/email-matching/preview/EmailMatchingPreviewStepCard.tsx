import {
  ChevronDown,
  FileText,
  Inbox,
  Mail,
  Sparkles,
  Target,
  Type,
} from "lucide-react";
import { Text } from "@repo/ui";

import type { EmailMatchingPreviewStep } from "./email-matching-preview-types.js";

const ICONS = {
  target: Target,
  senders: Mail,
  subject: Type,
  body: FileText,
  extractors: Sparkles,
  ingest: Inbox,
} as const;

interface EmailMatchingPreviewStepCardProps {
  readonly step: EmailMatchingPreviewStep;
  readonly mode: "overview" | "details" | "advanced";
  readonly showConnector?: boolean;
}

export function EmailMatchingPreviewStepCard({
  step,
  mode,
  showConnector = false,
}: EmailMatchingPreviewStepCardProps) {
  const Icon = ICONS[step.icon];

  const bullets =
    mode === "overview"
      ? step.bullets
      : mode === "advanced" && step.kind === "extractors"
        ? (step.details?.[1]?.bullets ?? step.bullets)
        : [
            ...(step.bullets ?? []),
            ...(step.details?.flatMap((section) => section.bullets ?? []) ??
              []),
          ];

  const detailSections =
    mode === "details"
      ? step.details?.filter(
          (_section, index) => step.kind !== "extractors" || index === 0,
        )
      : mode === "advanced" && step.kind === "extractors"
        ? step.details?.slice(1)
        : null;

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
                {bullets.map((line, index) => (
                  <li
                    key={`${step.id}-bullet-${String(index)}`}
                    className="text-foreground flex items-start gap-2 text-xs"
                  >
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="min-w-0 break-words">{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {detailSections
              ? detailSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <Text className="text-foreground text-xs font-medium">
                      {section.title}
                    </Text>
                    {section.bullets ? (
                      <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
                        {section.bullets.map((line, index) => (
                          <li
                            key={`${step.id}-detail-${section.title}-${String(index)}`}
                            className="break-words"
                          >
                            {line}
                          </li>
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
