import { useMemo, useState } from "react";
import { ChevronsDown, Columns2, type LucideIcon } from "lucide-react";
import { IconButton, Popover, type SegmentedSwitchOption } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { ItemListColumnsScope } from "./item-list-designer-columns-scope";

const SCOPE_ICONS: Record<ItemListColumnsScope, LucideIcon> = {
  grouped: Columns2,
  expanded: ChevronsDown,
};

interface ItemListDesignerColumnsScopeCollapsedMenuProps {
  readonly value: ItemListColumnsScope;
  readonly options: readonly SegmentedSwitchOption<ItemListColumnsScope>[];
  readonly onChange: (value: ItemListColumnsScope) => void;
  readonly ariaLabel: string;
}

export function ItemListDesignerColumnsScopeCollapsedMenu({
  value,
  options,
  onChange,
  ariaLabel,
}: ItemListDesignerColumnsScopeCollapsedMenuProps) {
  const [open, setOpen] = useState(false);
  const activeOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );
  const ActiveIcon = SCOPE_ICONS[value] ?? Columns2;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="right-start"
      layer="elevated"
      title={ariaLabel}
      panelClassName="w-max min-w-0 p-2"
      trigger={
        <IconButton
          type="button"
          size="sm"
          label={activeOption?.ariaLabel ?? ariaLabel}
          aria-expanded={open}
        >
          <ActiveIcon aria-hidden className="size-4" />
        </IconButton>
      }
    >
      <ul className="flex min-w-max flex-col gap-0.5" role="menu">
        {options.map((option) => {
          const OptionIcon = SCOPE_ICONS[option.value] ?? Columns2;
          const isActive = option.value === value;

          return (
            <li key={option.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onChange(option.value);
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
                <OptionIcon aria-hidden className="size-4 shrink-0" />
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}
