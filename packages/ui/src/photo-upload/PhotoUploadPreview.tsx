import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button";

interface PhotoUploadPreviewProps {
  readonly value?: string | null;
  readonly placeholderUrl?: string | null;
  readonly alt: string;
  readonly disabled?: boolean;
  readonly selectLabel: string;
  readonly changeLabel: string;
  readonly expandLabel: string;
  readonly previewClassName?: string;
  readonly onSelectClick: () => void;
  readonly onExpandClick: () => void;
}

export function PhotoUploadPreview({
  value,
  placeholderUrl,
  alt,
  disabled = false,
  selectLabel,
  changeLabel,
  expandLabel,
  previewClassName,
  onSelectClick,
  onExpandClick,
}: PhotoUploadPreviewProps) {
  const previewUrl = value ?? placeholderUrl ?? null;
  const isPlaceholder = !value && Boolean(placeholderUrl);

  return (
    <div className="flex flex-col gap-3">
      {previewUrl ? (
        <button
          type="button"
          aria-label={expandLabel}
          disabled={disabled || isPlaceholder}
          className={cn(
            "border-border bg-muted/30 hover:bg-muted/50 focus-visible:ring-primary inline-flex max-w-fit items-center justify-center rounded-lg border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
            isPlaceholder ? "opacity-80" : undefined,
            previewClassName,
          )}
          onClick={isPlaceholder ? undefined : onExpandClick}
        >
          <img
            src={previewUrl}
            alt={alt}
            className="max-h-24 max-w-xs object-contain"
          />
        </button>
      ) : (
        <div
          className={cn(
            "border-border bg-muted/30 text-muted-foreground flex h-24 w-40 items-center justify-center rounded-lg border border-dashed text-sm",
            previewClassName,
          )}
        >
          {selectLabel}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onSelectClick}
      >
        {previewUrl ? changeLabel : selectLabel}
      </Button>
    </div>
  );
}
