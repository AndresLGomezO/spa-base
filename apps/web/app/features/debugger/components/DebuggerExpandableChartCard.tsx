import { Card } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import type { LucideIcon } from "lucide-react";
import { Maximize2 } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { DEBUGGER_CHART_CARD_CLASS } from "../debugger-summary-motion";
import { DebuggerChartExpandModal } from "./DebuggerChartExpandModal";
import { DebuggerSectionHeading } from "./DebuggerSectionHeading";

export function DebuggerExpandableChartCard({
  title,
  icon,
  compactChart,
  expandedChart,
  className,
  contentLayout = "default",
}: {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly compactChart: ReactNode;
  readonly expandedChart: ReactNode;
  readonly className?: string;
  readonly contentLayout?: "default" | "contain";
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const openModal = () => setOpen(true);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal();
    }
  };

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-label={t("debugger.actions.expandChart", { title })}
        onClick={openModal}
        onKeyDown={handleKeyDown}
        className={cn(
          "group/chart min-w-[14rem] shrink-0 cursor-pointer space-y-3 p-4 text-left sm:min-w-[16rem] sm:flex-1",
          DEBUGGER_CHART_CARD_CLASS,
          className,
        )}
      >
        <Maximize2
          aria-hidden
          className="text-muted-foreground absolute right-3 top-3 z-20 size-3.5 opacity-0 transition-opacity group-hover/chart:opacity-70"
        />
        <DebuggerSectionHeading icon={icon}>{title}</DebuggerSectionHeading>
        {compactChart}
      </Card>

      <DebuggerChartExpandModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        contentLayout={contentLayout}
      >
        {expandedChart}
      </DebuggerChartExpandModal>
    </>
  );
}
