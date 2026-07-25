import { toast } from "@repo/ui";
import { CalendarClock, Sparkles, X } from "lucide-react";

import { i18n } from "../../i18n";
import { isAiSpendLimitError } from "../../lib/api-client";

type AiSpendNoticeKind = "blocked" | "approaching";

const TOAST_ID = "ai-spend-limit-notice";

function SpendAllowanceBubble({
  kind,
  toastId,
}: {
  readonly kind: AiSpendNoticeKind;
  readonly toastId: string | number;
}) {
  const paused = kind === "blocked";
  const title = paused
    ? i18n.t("aiSpend.notice.blockedTitle")
    : i18n.t("aiSpend.notice.approachingTitle");
  const body = paused
    ? i18n.t("aiSpend.notice.blockedBody")
    : i18n.t("aiSpend.notice.approachingBody");
  const dismissLabel = i18n.t("aiSpend.notice.dismiss");

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto relative w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-md"
      style={{
        borderColor: "color-mix(in oklab, #8b5cf6 22%, var(--color-border))",
        backgroundImage:
          "radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, #8b5cf6 12%, transparent), transparent 55%), radial-gradient(90% 80% at 0% 100%, color-mix(in oklab, #22d3ee 10%, transparent), transparent 50%), linear-gradient(color-mix(in oklab, var(--color-background) 94%, transparent), color-mix(in oklab, var(--color-background) 88%, transparent))",
        backdropFilter: "blur(14px)",
        boxShadow:
          "0 0 0 1px color-mix(in oklab, #22d3ee 8%, transparent), 0 12px 28px color-mix(in oklab, #8b5cf6 10%, transparent)",
      }}
    >
      <div className="flex gap-2.5 p-3 pr-9">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, #8b5cf6 20%, transparent), color-mix(in oklab, #22d3ee 16%, transparent))",
            color: "var(--color-primary)",
          }}
        >
          {paused ? (
            <CalendarClock className="size-3.5" aria-hidden />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-foreground text-[13px] leading-snug font-medium">
            {title}
          </p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {body}
          </p>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full transition-colors"
          aria-label={dismissLabel}
          onClick={() => toast.dismiss(toastId)}
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Soft, closable allowance bubble (not an error alert).
 * Call only from AI trigger paths — not on page mount.
 */
export function notifyAiSpendLimit(kind: AiSpendNoticeKind): void {
  toast.custom(
    (toastId) => <SpendAllowanceBubble kind={kind} toastId={toastId} />,
    {
      id: TOAST_ID,
      // Closable; auto-fade so navigation stays quiet.
      duration: kind === "blocked" ? 14_000 : 8_000,
      position: "bottom-right",
      unstyled: true,
      className: "ai-spend-allowance-bubble",
    },
  );
}

/** @returns true when the error was an AI spend limit and a notice was shown */
export function notifyAiSpendLimitFromError(error: unknown): boolean {
  if (!isAiSpendLimitError(error)) {
    return false;
  }
  notifyAiSpendLimit("blocked");
  return true;
}
