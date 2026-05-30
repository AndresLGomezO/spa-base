export type PageEntry = number | "ellipsis";

export function buildPageWindow(
  current: number,
  total: number,
  siblings = 1,
): readonly PageEntry[] {
  if (total <= 1) {
    return [1];
  }

  const set = new Set<number>([1, total]);
  for (let i = current - siblings; i <= current + siblings; i++) {
    if (i >= 1 && i <= total) {
      set.add(i);
    }
  }

  const pages = [...set].sort((a, b) => a - b);
  const out: PageEntry[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    out.push(page);
    const next = pages[i + 1];
    if (next !== undefined && next - page > 1) {
      out.push("ellipsis");
    }
  }

  return out;
}

export function totalPagesFromCount(
  totalCount: number,
  pageSize: number,
): number {
  if (totalCount <= 0 || pageSize <= 0) {
    return 0;
  }
  return Math.ceil(totalCount / pageSize);
}
