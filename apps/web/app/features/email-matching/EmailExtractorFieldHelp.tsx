import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import { IconButton, Popover, Text } from "@repo/ui";

type EmailExtractorHelpKey = "label" | "pattern" | "captureGroup";

const CLOSE_DELAY_MS = 150;

function EmailExtractorFieldHelp({
  fieldKey,
}: {
  readonly fieldKey: EmailExtractorHelpKey;
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  return (
    <div
      className="inline-flex"
      onMouseEnter={openPopover}
      onMouseLeave={scheduleClose}
      onFocus={openPopover}
      onBlur={scheduleClose}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="right-start"
        title={t(`platform.email.extractorFieldHelp.${fieldKey}.title`)}
        trigger={
          <IconButton
            label={t("platform.email.extractorFieldHelp.infoLabel")}
            size="sm"
            type="button"
            className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0"
          >
            <Info className="h-4 w-4" aria-hidden />
          </IconButton>
        }
      >
        <div
          className="max-w-xs space-y-2"
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
        >
          <Text className="text-muted-foreground text-sm">
            {t(`platform.email.extractorFieldHelp.${fieldKey}.description`)}
          </Text>
          <Text className="text-sm">
            <span className="font-medium">
              {t("platform.email.extractorFieldHelp.exampleLabel")}:{" "}
            </span>
            {t(`platform.email.extractorFieldHelp.${fieldKey}.example`)}
          </Text>
          <Text className="text-muted-foreground text-xs">
            {t(`platform.email.extractorFieldHelp.${fieldKey}.when`)}
          </Text>
        </div>
      </Popover>
    </div>
  );
}

export function EmailExtractorFieldLabel({
  htmlFor,
  label,
  fieldKey,
}: {
  readonly htmlFor?: string;
  readonly label: string;
  readonly fieldKey: EmailExtractorHelpKey;
}) {
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={htmlFor} className="text-foreground text-sm font-medium">
        {label}
      </label>
      <EmailExtractorFieldHelp fieldKey={fieldKey} />
    </div>
  );
}
