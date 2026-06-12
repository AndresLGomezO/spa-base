import { useMemo, useState } from "react";
import {
  AppWindow,
  LayoutGrid,
  ListOrdered,
  PanelBottom,
  type LucideIcon,
} from "lucide-react";
import { IconButton, Popover, type SegmentedSwitchOption } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { ComponentsTreeScope } from "./form-designer-components-layout";

const SCOPE_ICONS: Record<ComponentsTreeScope, LucideIcon> = {
  shell: AppWindow,
  step: ListOrdered,
  footer: PanelBottom,
  main: LayoutGrid,
};

interface FormDesignerStructureTreeCollapsedScopeMenuProps {
  readonly value: ComponentsTreeScope;
  readonly options: readonly SegmentedSwitchOption<ComponentsTreeScope>[];
  readonly onChange: (value: ComponentsTreeScope) => void;
  readonly ariaLabel: string;
}

export function FormDesignerStructureTreeCollapsedScopeMenu({
  value,
  options,
  onChange,
  ariaLabel,
}: FormDesignerStructureTreeCollapsedScopeMenuProps) {
  const [open, setOpen] = useState(false);
  const activeOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );
  const ActiveIcon = SCOPE_ICONS[value] ?? LayoutGrid;

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
          const OptionIcon = SCOPE_ICONS[option.value] ?? LayoutGrid;
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

interface FormDesignerStructureTreeCollapsedStepMenuProps {
  readonly stepIndex: number;
  readonly steps: readonly { readonly id: string; readonly label: string }[];
  readonly onChange: (index: number) => void;
  readonly ariaLabel: string;
  readonly stepLabel: string;
}

export function FormDesignerStructureTreeCollapsedStepMenu({
  stepIndex,
  steps,
  onChange,
  ariaLabel,
  stepLabel,
}: FormDesignerStructureTreeCollapsedStepMenuProps) {
  const [open, setOpen] = useState(false);
  const activeStep = steps[stepIndex];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="right-start"
      layer="elevated"
      title={stepLabel}
      panelClassName="w-max min-w-0 p-2"
      trigger={
        <IconButton
          type="button"
          size="sm"
          label={activeStep ? `${stepLabel}: ${activeStep.label}` : ariaLabel}
          aria-expanded={open}
          className="text-xs font-semibold tabular-nums"
        >
          <ListOrdered aria-hidden className="size-4" />
        </IconButton>
      }
    >
      <ul className="flex min-w-max flex-col gap-0.5" role="menu">
        {steps.map((step, index) => {
          const isActive = index === stepIndex;

          return (
            <li key={step.id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onChange(index);
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
                <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">
                  {index + 1}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}
