import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { IconButton, Popover, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

interface MetricsRowDesignerCollapsedWidgetMenuProps {
  readonly selectedWidgetId: string;
  readonly widgets: readonly { readonly id: string; readonly name: string }[];
  readonly onChange: (widgetId: string) => void;
  readonly ariaLabel: string;
  readonly widgetLabel: string;
}

export function MetricsRowDesignerCollapsedWidgetMenu({
  selectedWidgetId,
  widgets,
  onChange,
  ariaLabel,
  widgetLabel,
}: MetricsRowDesignerCollapsedWidgetMenuProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const activeWidget = widgets.find((widget) => widget.id === selectedWidgetId);
  const hasWidgets = widgets.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="right-start"
      layer="elevated"
      title={widgetLabel}
      panelClassName="w-max min-w-0 p-2"
      trigger={
        <IconButton
          type="button"
          size="sm"
          label={
            activeWidget
              ? `${widgetLabel}: ${activeWidget.name}`
              : hasWidgets
                ? ariaLabel
                : t("metricsRowDesigner.widgets.emptyDropdown")
          }
          aria-expanded={open}
        >
          <LayoutGrid aria-hidden className="size-4" />
        </IconButton>
      }
    >
      {!hasWidgets ? (
        <Text className="text-muted-foreground px-2 py-1 text-sm">
          {t("metricsRowDesigner.widgets.emptyTree")}
        </Text>
      ) : (
        <ul className="flex min-w-max flex-col gap-0.5" role="menu">
          {widgets.map((widget) => {
            const isActive = widget.id === selectedWidgetId;

            return (
              <li key={widget.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    onChange(widget.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full min-w-max items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium whitespace-nowrap transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                >
                  {widget.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}
