import { cn } from "@repo/theme/utils";

import type { DatePickerPreset } from "./date-picker.types.js";

interface DatePickerPresetsProps {
  readonly presets: readonly DatePickerPreset[];
  readonly selectedValue?: string | null;
  readonly onSelect: (value: string) => void;
  readonly className?: string;
}

export function DatePickerPresets({
  presets,
  selectedValue,
  onSelect,
  className,
}: DatePickerPresetsProps) {
  if (presets.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {presets.map((preset) => {
        const selected = selectedValue === preset.value;
        return (
          <button
            key={`${preset.label}-${preset.value}`}
            type="button"
            className={cn(
              "min-h-11 rounded-md border px-3 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-accent",
            )}
            onClick={() => onSelect(preset.value)}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
