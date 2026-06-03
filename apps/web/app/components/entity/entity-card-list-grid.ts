const DEFAULT_CARDS_PER_ROW = 1;
export const MIN_CARDS_PER_ROW = 1;
export const MAX_CARDS_PER_ROW = 4;

const GRID_COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

const RESPONSIVE_BREAKPOINTS = [
  { prefix: "", cap: 1 },
  { prefix: "sm:", cap: 2 },
  { prefix: "lg:", cap: 3 },
  { prefix: "xl:", cap: 4 },
] as const;

export function clampCardsPerRow(value: number | undefined): number {
  const resolved = value ?? DEFAULT_CARDS_PER_ROW;
  return Math.min(
    MAX_CARDS_PER_ROW,
    Math.max(MIN_CARDS_PER_ROW, Math.trunc(resolved)),
  );
}

export function getEntityCardListGridClass(
  cardsPerRow: number | undefined,
): string {
  const maxPerRow = clampCardsPerRow(cardsPerRow);
  const classes: string[] = [];

  for (const { prefix, cap } of RESPONSIVE_BREAKPOINTS) {
    const cols = Math.min(maxPerRow, cap);
    const colClass = GRID_COLS_CLASS[cols];
    if (!colClass) {
      continue;
    }

    const nextClass = prefix ? `${prefix}${colClass}` : colClass;
    if (classes.at(-1) === nextClass) {
      continue;
    }

    classes.push(nextClass);
  }

  return classes.join(" ");
}
