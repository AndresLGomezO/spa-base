import type { CSSProperties } from "react";

import { cn } from "@repo/theme/utils";

import { clampCardImageSizePx } from "./image-size.js";

type CardFieldImageObjectFit = "contain" | "cover" | "fill";

export interface CardFieldImageProps {
  readonly src: string | null | undefined;
  readonly alt?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly imageClassName?: string;
  /** Max edge length in px; image keeps aspect ratio within this box. */
  readonly sizePx?: number;
  readonly objectFit?: CardFieldImageObjectFit;
  /** When true, image fills its positioned parent (overlay/decorative layouts). */
  readonly fillContainer?: boolean;
}

export function CardFieldImage({
  src,
  alt = "Image",
  className,
  style,
  imageClassName,
  sizePx,
  objectFit = "contain",
  fillContainer = false,
}: CardFieldImageProps) {
  const size = clampCardImageSizePx(sizePx);
  const imageBoundsStyle: CSSProperties = fillContainer
    ? {
        width: "100%",
        height: "100%",
        objectFit,
      }
    : {
        maxWidth: size,
        maxHeight: size,
        width: "auto",
        height: "auto",
        objectFit,
      };
  const placeholderBoxStyle: CSSProperties = fillContainer
    ? { width: "100%", height: "100%" }
    : { width: size, height: size };

  if (!src) {
    return (
      <div
        style={{ ...placeholderBoxStyle, ...style }}
        className={cn(
          fillContainer
            ? "bg-muted text-muted-foreground m-0 flex h-full w-full items-center justify-center p-0 text-xs"
            : "bg-muted text-muted-foreground m-0 flex shrink-0 items-center justify-center rounded-full p-0 text-xs",
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
      style={{ ...imageBoundsStyle, ...style }}
      className={cn(
        fillContainer
          ? "m-0 block h-full w-full p-0"
          : "m-0 block shrink-0 object-contain p-0",
        imageClassName,
        className,
      )}
    />
  );
}
