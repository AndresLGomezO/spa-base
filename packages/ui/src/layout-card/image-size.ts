export const DEFAULT_CARD_IMAGE_SIZE_PX = 40;
const CARD_IMAGE_SIZE_STEP_PX = 8;
export const MIN_CARD_IMAGE_SIZE_PX = 8;
export const MAX_CARD_IMAGE_SIZE_PX = 1024;

export function clampCardImageSizePx(size: number | undefined): number {
  const resolved = size ?? DEFAULT_CARD_IMAGE_SIZE_PX;
  return Math.min(
    MAX_CARD_IMAGE_SIZE_PX,
    Math.max(MIN_CARD_IMAGE_SIZE_PX, Math.round(resolved)),
  );
}

export function stepCardImageSizeUp(size: number | undefined): number {
  return clampCardImageSizePx(
    clampCardImageSizePx(size) + CARD_IMAGE_SIZE_STEP_PX,
  );
}

export function stepCardImageSizeDown(size: number | undefined): number {
  return clampCardImageSizePx(
    clampCardImageSizePx(size) - CARD_IMAGE_SIZE_STEP_PX,
  );
}
