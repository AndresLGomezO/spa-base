import { Button, IconButton, Text, toast } from "@repo/ui";
import { Clipboard, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../lib/api-client";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DebuggerJsonViewDialog } from "./components/DebuggerJsonViewDialog";
import { useDebugger } from "./debugger-context";
import { debuggerSourceLabelKey } from "./debugger-source-config";
import { buildDebugRecordKey } from "./dismissed-debug-records";

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DebuggerRecordRow({ event }: { readonly event: DebugEvent }) {
  const { t } = useTranslation("common");
  const { selectedRecordKey, selectRecord, dismissRecord } = useDebugger();
  const recordKey = buildDebugRecordKey(event.source, event.id);
  const isSelected =
    selectedRecordKey === recordKey || selectedRecordKey === event.id;

  return (
    <div
      role="treeitem"
      className={`group/node flex w-full min-w-max cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-all duration-150 ${
        isSelected
          ? "bg-primary/10 ring-primary ring-2 ring-inset"
          : "hover:bg-muted/50"
      }`}
      onClick={() => selectRecord(event)}
    >
      <div className="min-w-0 flex-1 px-2">
        <Text className="truncate text-sm font-medium">{event.title}</Text>
        <Text className="text-muted-foreground truncate text-xs">
          {event.subtitle ?? event.timestamp}
        </Text>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
        <IconButton
          type="button"
          size="sm"
          label={t("debugger.actions.copy")}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            void navigator.clipboard.writeText(formatJson(event));
            toast.success(t("debugger.actions.copied"));
          }}
        >
          <Clipboard aria-hidden className="size-4" />
        </IconButton>
        <IconButton
          type="button"
          size="sm"
          label={t("debugger.actions.dismiss")}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            dismissRecord(event);
          }}
        >
          <Trash2 aria-hidden className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

export function DebuggerListTreePanel() {
  const { t } = useTranslation("common");
  const { activeSource, sourceEvents, refresh, isLoading } = useDebugger();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const refreshRow = (
    <button
      type="button"
      className="hover:bg-muted/50 flex w-full min-w-max cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
      onClick={refresh}
      disabled={isLoading}
    >
      <RefreshCw
        aria-hidden
        className={`text-muted-foreground size-4 shrink-0 ${isLoading ? "animate-spin" : ""}`}
      />
      <Text className="text-sm font-medium">
        {t("debugger.actions.refresh")}
      </Text>
    </button>
  );

  const scopeSection = (
    <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setJsonDialogOpen(true)}
        disabled={sourceEvents.length === 0}
      >
        {t("debugger.actions.viewJson")}
      </Button>
    </div>
  );

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t(debuggerSourceLabelKey(activeSource))}
        expandLabel={t("debugger.list.expandPanel")}
        collapseLabel={t("debugger.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={refreshRow}
        scopeSection={scopeSection}
      >
        <div className="flex w-full min-w-max flex-col gap-2 py-1">
          {refreshRow}
          {sourceEvents.length === 0 && !isLoading ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {t("debugger.list.emptySource")}
            </Text>
          ) : (
            <ul className="space-y-1 px-1">
              {sourceEvents.map((event) => (
                <li key={buildDebugRecordKey(event.source, event.id)}>
                  <DebuggerRecordRow event={event} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </ItemListDesignerTreePanelShell>

      <DebuggerJsonViewDialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        title={t("debugger.actions.viewJson")}
        value={sourceEvents}
      />
    </>
  );
}
