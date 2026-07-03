import type { ExpressionNode } from "@repo/hooks";

import {
  binary,
  call,
  coalesce,
  formulaRef,
  ifExpr,
  lit,
  unary,
} from "./math-formula-nodes.js";

export {
  binary,
  call,
  coalesce,
  formulaRef,
  ifExpr,
  lit,
  unary,
};

export function fieldCurrent(path: string): ExpressionNode {
  return { kind: "field", source: "current", path };
}

export function fieldParent(path: string): ExpressionNode {
  return { kind: "field", source: "loaded", alias: "parent", path };
}

export function fieldTerms(path: string): ExpressionNode {
  return { kind: "field", source: "loaded", alias: "terms", path };
}

export function varRef(name: "loopIndex" | "loopState" | "now"): ExpressionNode {
  return { kind: "var", name };
}

export function switchExpr(
  input: ExpressionNode,
  cases: readonly {
    readonly when: ExpressionNode;
    readonly then: ExpressionNode;
  }[],
  defaultCase: ExpressionNode,
): ExpressionNode {
  return { kind: "switch", input, cases, default: defaultCase };
}

export function amortizationType(): ExpressionNode {
  return coalesce(fieldCurrent("amortizationType"), lit("FRENCH"));
}

export function tenantAnnuityPaymentCall(): ExpressionNode {
  return formulaRef("annuityPayment", {
    principal: formulaRef("loanCoalescePrincipal"),
    ratePerPeriod: formulaRef("loanMonthlyRate"),
    periods: formulaRef("loanTermMonths"),
  });
}
