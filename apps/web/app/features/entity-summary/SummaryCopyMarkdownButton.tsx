import { useEffect, useRef, useState } from "react";
import { Check, Clipboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton, toast } from "@repo/ui";
import { cn } from "@repo/theme/utils";

const COPIED_VISIBLE_MS = 2000;

interface SummaryCopyMarkdownButtonProps {
  /** Returns the markdown to copy (e.g. active tab text). */
  readonly getText: () => string;
}

export function SummaryCopyMarkdownButton({
  getText,
}: SummaryCopyMarkdownButtonProps) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <IconButton
      type="button"
      size="sm"
      label={
        copied
          ? t("entity.summary.copiedMarkdown")
          : t("entity.summary.copyMarkdown")
      }
      onClick={() => {
        const text = getText().trim();
        if (!text) {
          return;
        }
        void navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            toast.success(t("entity.summary.copiedMarkdown"));
            if (resetTimerRef.current !== null) {
              clearTimeout(resetTimerRef.current);
            }
            resetTimerRef.current = setTimeout(() => {
              setCopied(false);
              resetTimerRef.current = null;
            }, COPIED_VISIBLE_MS);
          },
          () => {
            toast.error(t("entity.summary.copyMarkdownFailed"));
          },
        );
      }}
    >
      <span className="relative inline-flex size-4 items-center justify-center">
        <Clipboard
          aria-hidden
          className={cn(
            "absolute size-4 transition-[opacity,transform] duration-200 ease-out",
            copied ? "scale-75 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <Check
          aria-hidden
          className={cn(
            "absolute size-4 text-primary transition-[opacity,transform] duration-200 ease-out",
            copied ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        />
      </span>
    </IconButton>
  );
}
