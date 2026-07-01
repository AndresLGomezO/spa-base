import { describe, expect, it } from "vitest";

import { EXPRESSION_FUNCTIONS } from "./expression.js";
import {
  EXPRESSION_FUNCTION_SPECS,
  getExpressionFunctionSpec,
} from "./expression-function-spec.js";

describe("expression function specs", () => {
  it("covers every registered function", () => {
    for (const fn of EXPRESSION_FUNCTIONS) {
      expect(EXPRESSION_FUNCTION_SPECS[fn]).toBeDefined();
      expect(getExpressionFunctionSpec(fn).maxArgs).toBeGreaterThanOrEqual(
        getExpressionFunctionSpec(fn).minArgs,
      );
    }
  });

  it("marks variadic functions", () => {
    expect(getExpressionFunctionSpec("concat").variadic).toBe(true);
    expect(getExpressionFunctionSpec("if").variadic).toBeUndefined();
  });

  it("uses date unit for dateAdd third argument", () => {
    expect(getExpressionFunctionSpec("dateAdd").args[2]?.kind).toBe("dateUnit");
  });
});
