import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import { IconButton, Popover, Text } from "@repo/ui";

type MetricFieldHelpKey = "fieldsDependency" | "groupBy" | "dimensions";

interface MetricFieldHelpProps {
  readonly fieldKey: MetricFieldHelpKey;
}

const CLOSE_DELAY_MS = 150;

function MetricFieldHelp({ fieldKey }: MetricFieldHelpProps) {
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
        title={t(`metrics.fieldHelp.${fieldKey}.title`)}
        trigger={
          <IconButton
            label={t("metrics.fieldHelp.infoLabel")}
            size="sm"
            type="button"
            className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0"
          >
            <Info className="h-4 w-4" aria-hidden />
          </IconButton>
        }
      >
        <div
          className="space-y-2"
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
        >
          <Text className="text-muted-foreground text-sm">
            {t(`metrics.fieldHelp.${fieldKey}.description`)}
          </Text>
          <Text className="text-sm">
            <span className="font-medium">
              {t("metrics.fieldHelp.exampleLabel")}:{" "}
            </span>
            {t(`metrics.fieldHelp.${fieldKey}.example`)}
          </Text>
        </div>
      </Popover>
    </div>
  );
}

export function MetricFieldLabel({
  htmlFor,
  label,
  fieldKey,
}: {
  readonly htmlFor: string;
  readonly label: string;
  readonly fieldKey: MetricFieldHelpKey;
}) {
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      <MetricFieldHelp fieldKey={fieldKey} />
    </div>
  );
}
