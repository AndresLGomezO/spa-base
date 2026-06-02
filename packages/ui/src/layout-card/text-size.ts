export const DEFAULT_CARD_TEXT_SIZE_PX = 14;
const CARD_TEXT_SIZE_STEP_PX = 2;
export const MIN_CARD_TEXT_SIZE_PX = 10;
export const MAX_CARD_TEXT_SIZE_PX = 32;

export function clampCardTextSizePx(size: number | undefined): number {
  const resolved = size ?? DEFAULT_CARD_TEXT_SIZE_PX;
  return Math.min(
    MAX_CARD_TEXT_SIZE_PX,
    Math.max(MIN_CARD_TEXT_SIZE_PX, Math.round(resolved)),
  );
}

export function stepCardTextSizeUp(size: number | undefined): number {
  return clampCardTextSizePx(
    clampCardTextSizePx(size) + CARD_TEXT_SIZE_STEP_PX,
  );
}

export function stepCardTextSizeDown(size: number | undefined): number {
  return clampCardTextSizePx(
    clampCardTextSizePx(size) - CARD_TEXT_SIZE_STEP_PX,
  );
}
