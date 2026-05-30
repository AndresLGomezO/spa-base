import { X } from "lucide-react";

interface FilterValueBadgeProps {
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
    <span className="border-border bg-muted text-foreground inline-flex max-w-full items-center gap-1.5 rounded-xl border px-2.5 py-1 text-sm font-medium shadow-sm">
      <span className="max-w-[180px] truncate">{label}</span>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
        aria-label={removeAriaLabel}
        className="hover:bg-background focus-visible:ring-ring rounded-full p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="h-3.5 w-3.5 shrink-0" />
      </button>
    </span>
  );
}
