export const SCROLL_COLUMN_ITEM_HEIGHT = 32;
export const SCROLL_COLUMN_VIEWPORT_HEIGHT = 144;
export const SCROLL_COLUMN_PADDING =
  (SCROLL_COLUMN_VIEWPORT_HEIGHT - SCROLL_COLUMN_ITEM_HEIGHT) / 2;

export function getScrollTopForIndex(index: number): number {
  return index * SCROLL_COLUMN_ITEM_HEIGHT;
}

export function getIndexFromScrollTop(
  scrollTop: number,
  itemCount: number,
): number {
  const index = Math.round(scrollTop / SCROLL_COLUMN_ITEM_HEIGHT);
  return Math.min(Math.max(index, 0), Math.max(itemCount - 1, 0));
}

export function getAdjacentIndex(
  currentIndex: number,
  delta: number,
  itemCount: number,
): number {
  if (itemCount <= 0) {
    return 0;
  }
  return Math.min(Math.max(currentIndex + delta, 0), itemCount - 1);
}
