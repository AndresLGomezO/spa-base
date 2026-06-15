import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { IconButton, Popover, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

interface DashboardLayoutDesignerCollapsedSectionMenuProps {
  readonly selectedSectionId: string;
  readonly sections: readonly { readonly id: string; readonly name: string }[];
  readonly onChange: (sectionId: string) => void;
  readonly ariaLabel: string;
  readonly sectionLabel: string;
}

export function DashboardLayoutDesignerCollapsedSectionMenu({
  selectedSectionId,
  sections,
  onChange,
  ariaLabel,
  sectionLabel,
}: DashboardLayoutDesignerCollapsedSectionMenuProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const activeSection = sections.find(
    (section) => section.id === selectedSectionId,
  );
  const hasSections = sections.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="right-start"
      layer="elevated"
      title={sectionLabel}
      panelClassName="w-max min-w-0 p-2"
      trigger={
        <IconButton
          type="button"
          size="sm"
          label={
            activeSection
              ? `${sectionLabel}: ${activeSection.name}`
              : hasSections
                ? ariaLabel
                : t("dashboardLayoutDesigner.sections.emptyDropdown")
          }
          aria-expanded={open}
        >
          <LayoutGrid aria-hidden className="size-4" />
        </IconButton>
      }
    >
      {!hasSections ? (
        <Text className="text-muted-foreground px-2 py-1 text-sm">
          {t("dashboardLayoutDesigner.sections.emptyTree")}
        </Text>
      ) : (
        <ul className="flex min-w-max flex-col gap-0.5" role="menu">
          {sections.map((section) => {
            const isActive = section.id === selectedSectionId;

            return (
              <li key={section.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    onChange(section.id);
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
                  {section.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}
