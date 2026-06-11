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
  const boxStyle: CSSProperties = { width: size, height: size };

  if (!src) {
    return (
      <div
        style={{ ...boxStyle, ...style }}
        className={cn(
          "bg-muted text-muted-foreground m-0 flex shrink-0 items-center justify-center rounded-full p-0 text-xs",
          className,
        )}
      >
        —
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ ...boxStyle, ...style }}
      className={cn(
        "m-0 block shrink-0 object-contain p-0",
        imageClassName,
        className,
      )}
    />
  );
}
