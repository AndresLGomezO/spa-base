import { Button, Heading, Text, toast } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { DebuggerJsonViewDialog } from "./components/DebuggerJsonViewDialog";
import { DebuggerStatusBadge } from "./components/DebuggerStatusBadge";
import { DebuggerSummaryPanel } from "./DebuggerSummaryPanel";
import { useDebugger } from "./debugger-context";
import { AiJobDebugDetail } from "./sources/ai-job-detail";
import { AuditDebugDetail } from "./sources/audit-detail";
import { HookExecutionDebugDetail } from "./sources/hook-execution-detail";
import { HookLogDebugDetail } from "./sources/hook-log-detail";
import { RequestPerfDebugDetail } from "./sources/request-perf-detail";

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DebuggerDetailBody({
  event,
}: {
  readonly event: NonNullable<ReturnType<typeof useDebugger>["selectedEvent"]>;
}) {
  switch (event.source) {
    case "ai":
      return <AiJobDebugDetail event={event} />;
    case "hookExecution":
      return <HookExecutionDebugDetail event={event} />;
    case "hookLog":
      return <HookLogDebugDetail event={event} />;
    case "audit":
      return <AuditDebugDetail event={event} />;
    case "requestPerf":
      return <RequestPerfDebugDetail event={event} />;
    default:
      return null;
  }
}

export function DebuggerDetailPanel() {
  const { t } = useTranslation("common");
  const { selectedEvent, clearSelectedRecord } = useDebugger();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const detailValue = useMemo(() => {
    if (!selectedEvent) {
      return null;
    }
    return selectedEvent.payload ?? selectedEvent;
  }, [selectedEvent]);

  if (!selectedEvent) {
    return <DebuggerSummaryPanel />;
  }

  return (
    <>
      <section
        className={cn(
          designerPreviewPanelShellClassName,
          designerPreviewPanelShellFillClassName,
        )}
      >
        <div className={cn(designerPreviewPanelHeaderClassName, "shrink-0")}>
          <div className="min-w-0 flex-1">
            <Heading level={2}>{selectedEvent.title}</Heading>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <DebuggerStatusBadge status={selectedEvent.status} />
              <Text className="text-muted-foreground text-sm">
                {selectedEvent.timestamp}
              </Text>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearSelectedRecord}
            >
              <ArrowLeft aria-hidden className="mr-2 size-4" />
              {t("debugger.actions.backToSummary")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setJsonDialogOpen(true)}
            >
              {t("debugger.actions.viewJson")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(formatJson(detailValue));
                toast.success(t("debugger.actions.copied"));
              }}
            >
              {t("debugger.actions.copyJson")}
            </Button>
          </div>
        </div>
        <div className={designerPreviewPanelBodyFillClassName}>
          <DebuggerDetailBody event={selectedEvent} />
        </div>
      </section>

      <DebuggerJsonViewDialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        title={t("debugger.actions.viewJson")}
        value={detailValue}
      />
    </>
  );
}
