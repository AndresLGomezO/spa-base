import { describe, expect, it } from "vitest";

import type { ColumnNode } from "../types/layout.js";
import {
  buildGridTemplateColumnsFromPercents,
  resolveColumnWidthPercents,
} from "./resolve-column-width-percents.js";

function col(widthPercent?: number): ColumnNode {
  return { id: "c", rows: [], widthPercent };
}

describe("resolveColumnWidthPercents", () => {
  it("returns equal split when no explicit widths", () => {
    expect(resolveColumnWidthPercents([col(), col()])).toEqual([50, 50]);
    expect(resolveColumnWidthPercents([col(), col(), col()])).toEqual([
      33, 33, 34,
    ]);
  });

  it("fills remainder for one explicit column in two-column row", () => {
    expect(resolveColumnWidthPercents([col(20), col()])).toEqual([20, 80]);
  });

  it("splits remainder equally among auto columns", () => {
    expect(resolveColumnWidthPercents([col(20), col(), col()])).toEqual([
      20, 40, 40,
    ]);
  });

  it("assigns remainder to the last auto column when two are explicit", () => {
    expect(resolveColumnWidthPercents([col(20), col(30), col()])).toEqual([
      20, 30, 50,
    ]);
  });

  it("normalizes when all columns are explicit but sum is not 100", () => {
    expect(resolveColumnWidthPercents([col(20), col(30), col(40)])).toEqual([
      22, 33, 45,
    ]);
  });

  it("keeps values when all explicit and sum is 100", () => {
    expect(resolveColumnWidthPercents([col(20), col(80)])).toEqual([20, 80]);
  });
});

describe("buildGridTemplateColumnsFromPercents", () => {
  it("builds proportional fr tracks", () => {
    expect(buildGridTemplateColumnsFromPercents([20, 80])).toBe(
      "minmax(0, 20fr) minmax(0, 80fr)",
    );
  });
});
