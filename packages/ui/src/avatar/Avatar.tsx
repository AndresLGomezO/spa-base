import { cn } from "@repo/theme/utils";

export interface AvatarProps {
  readonly src?: string | null;
  readonly alt: string;
  readonly fallback: string;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(
        "border-border bg-primary-600 text-white relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border font-medium",
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </span>
  );
}
