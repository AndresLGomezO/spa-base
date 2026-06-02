import { describe, expect, it } from "vitest";

import {
  clampCardsPerRow,
  getEntityCardListGridClass,
} from "./entity-card-list-grid";

describe("getEntityCardListGridClass", () => {
  it("always uses one column when max is 1", () => {
    expect(getEntityCardListGridClass(1)).toBe(
      "grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1",
    );
  });

  it("scales up to the configured max on larger breakpoints", () => {
    expect(getEntityCardListGridClass(3)).toBe(
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3",
    );
  });

  it("caps at four columns on xl when max is 4", () => {
    expect(getEntityCardListGridClass(4)).toBe(
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    );
  });
});

describe("clampCardsPerRow", () => {
  it("defaults to 1 and clamps out-of-range values", () => {
    expect(clampCardsPerRow(undefined)).toBe(1);
    expect(clampCardsPerRow(0)).toBe(1);
    expect(clampCardsPerRow(9)).toBe(4);
  });
});
