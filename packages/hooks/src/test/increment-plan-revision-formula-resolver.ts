import type {
  FormulaDefinitionForEval,
  FormulaResolver,
} from "../expression.js";

const incrementPlanRevisionFormula: FormulaDefinitionForEval = {
  name: "incrementPlanRevision",
  inputs: [],
  body: {
    kind: "binary",
    op: "+",
    left: {
      kind: "call",
      fn: "coalesce",
      args: [
        {
          kind: "field",
          source: "current",
          path: "planRevision",
        },
        {
          kind: "literal",
          value: 0,
        },
      ],
    },
    right: {
      kind: "literal",
      value: 1,
    },
  },
};

export function createIncrementPlanRevisionFormulaResolver(): FormulaResolver {
  return {
    resolve(name) {
      if (name === "incrementPlanRevision") {
        return incrementPlanRevisionFormula;
      }
      return undefined;
    },
  };
}
