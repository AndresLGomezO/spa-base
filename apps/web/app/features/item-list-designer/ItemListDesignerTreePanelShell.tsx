import { useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  IconButton,
  JsonActionTriggerGroup,
  Text,
  type JsonActionTriggerLabels,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";

interface ItemListDesignerTreePanelShellProps {
  readonly title: string;
  readonly expandLabel: string;
  readonly collapseLabel: string;
  readonly children: ReactNode;
  readonly collapsedContent: ReactNode;
  readonly expandedClassName?: string;
  readonly collapsedClassName?: string;
  readonly expandedBodyClassName?: string;
  readonly collapsedBodyClassName?: string;
  readonly collapsedHeaderContent?: ReactNode;
  readonly headerActions?: ReactNode;
  readonly jsonTriggerLabels?: JsonActionTriggerLabels;
  readonly jsonTriggerShowGroupLabel?: boolean;
  readonly scopeSection?: ReactNode;
  readonly footer?: ReactNode;
}

export function ItemListDesignerTreePanelShell({
  title,
  expandLabel,
  collapseLabel,
  children,
  collapsedContent,
  expandedClassName,
  collapsedClassName,
  expandedBodyClassName,
  collapsedBodyClassName,
  collapsedHeaderContent,
  headerActions,
  jsonTriggerLabels,
  jsonTriggerShowGroupLabel = true,
  scopeSection,
  footer,
}: ItemListDesignerTreePanelShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside
        className={cn(
          "bg-card border-border flex w-12 shrink-0 flex-col items-center rounded-xl border shadow-sm",
          designerTreePanelShellClassName,
          "transition-[width,opacity] duration-300 ease-out",
          collapsedClassName,
        )}
      >
        <div className="border-border flex w-full flex-col items-center gap-2 border-b px-1.5 py-2.5">
          <IconButton
            type="button"
            size="sm"
            label={expandLabel}
            className="text-primary hover:text-primary bg-primary/10 hover:bg-primary/20"
            onClick={() => setCollapsed(false)}
          >
            <PanelLeftOpen aria-hidden className="size-4" />
          </IconButton>
          {collapsedHeaderContent}
        </div>
        <div
          className={cn(
            "min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-3",
            collapsedBodyClassName,
          )}
        >
          {collapsedContent}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "bg-card border-border flex w-fit max-w-full shrink-0 flex-col rounded-xl border shadow-sm",
        designerTreePanelShellClassName,
        "transition-[width,opacity] duration-300 ease-out",
        expandedClassName,
      )}
    >
      <div className="border-border flex w-full min-w-0 shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <Text
          as="span"
          className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold tracking-tight"
        >
          {title}
        </Text>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions ? (
            jsonTriggerLabels ? (
              <JsonActionTriggerGroup
                labels={jsonTriggerLabels}
                showGroupLabel={jsonTriggerShowGroupLabel}
              >
                {headerActions}
              </JsonActionTriggerGroup>
            ) : (
              headerActions
            )
          ) : null}
          <IconButton
            type="button"
            size="sm"
            label={collapseLabel}
            className="text-primary hover:text-primary bg-primary/10 hover:bg-primary/20"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose aria-hidden className="size-4" />
          </IconButton>
        </div>
      </div>
      {scopeSection ? (
        <div className="border-border flex w-full min-w-0 flex-col gap-2 border-b px-3 py-2.5">
          {scopeSection}
        </div>
      ) : null}
      <div
        className={cn(
          "min-h-0 w-max max-w-full flex-1 overflow-y-auto overflow-x-auto px-2 pb-3",
          expandedBodyClassName,
        )}
      >
        {children}
      </div>
      {footer}
    </aside>
  );
}
