import type { CSSProperties } from "react";

import { cn } from "@repo/theme/utils";

import { clampCardImageSizePx } from "./image-size.js";

export interface CardFieldImageProps {
  readonly src: string | null | undefined;
  readonly alt?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly imageClassName?: string;
  /** Square box size in px; image uses object-contain to preserve aspect ratio. */
  readonly sizePx?: number;
}

export function CardFieldImage({
  src,
  alt = "Image",
  className,
  style,
  imageClassName,
  sizePx,
}: CardFieldImageProps) {
  const size = clampCardImageSizePx(sizePx);
  const boxStyle = { width: size, height: size };

  if (!src) {
    return (
      <div
        style={{ ...boxStyle, ...style }}
        className={cn(
          "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-full text-xs",
          className,
        )}
      >
        —
      </div>
    );
  }

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center", className)}
      style={{ ...boxStyle, ...style }}
    >
      <img
        src={src}
        alt={alt}
        style={boxStyle}
        className={cn("rounded-md object-contain", imageClassName)}
      />
    </div>
  );
}
