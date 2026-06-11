import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@repo/theme/utils";

export type TabbedPanelTabId = string;

export interface TabbedPanelTab {
  readonly id: TabbedPanelTabId;
  readonly label: string;
  readonly panel: ReactNode;
}

export interface TabbedPanelProps {
  readonly tabs: readonly TabbedPanelTab[];
  readonly activeTabId: TabbedPanelTabId;
  readonly onTabChange: (tabId: TabbedPanelTabId) => void;
  readonly ariaLabel: string;
  readonly className?: string;
}

export function TabbedPanel({
  tabs,
  activeTabId,
  onTabChange,
  ariaLabel,
  className,
}: TabbedPanelProps) {
  const baseId = useId();
  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  if (!activeTab) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="border-border flex shrink-0 gap-1 border-b"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={`${baseId}-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab.id}`}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {activeTab.panel}
      </div>
    </div>
  );
}
