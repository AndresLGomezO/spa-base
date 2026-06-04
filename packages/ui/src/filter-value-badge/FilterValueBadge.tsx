import { X } from "lucide-react";

export interface FilterValueBadgeProps {
  readonly label: string;
  readonly onRemove: () => void;
  readonly removeAriaLabel: string;
}

export function FilterValueBadge({
  label,
  onRemove,
  removeAriaLabel,
}: FilterValueBadgeProps) {
  return (
    <span className="border-border bg-muted text-foreground inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium shadow-sm">
      <span className="max-w-[180px] truncate">{label}</span>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
        aria-label={removeAriaLabel}
        className="hover:bg-background focus-visible:ring-ring flex size-4 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="size-2.5 shrink-0" strokeWidth={2.5} />
      </button>
    </span>
  );
}
