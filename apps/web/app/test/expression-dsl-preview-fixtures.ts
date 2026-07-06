import type { ExpressionNode } from "@repo/hooks";

export const amortizationLoopStateBody: ExpressionNode = {
  kind: "binary",
  op: "-",
  left: { kind: "formula", name: "loanPeriodBalance", inputs: {} },
  right: { kind: "formula", name: "schedulePrincipalPortion", inputs: {} },
};

export const schedulePrincipalPortionBody: ExpressionNode = {
  kind: "formula",
  name: "loanPrincipalPayment",
  inputs: {},
};

export const loanPrincipalPaymentBody: ExpressionNode = {
  kind: "switch",
  input: {
    kind: "call",
    fn: "coalesce",
    args: [
      {
        kind: "field",
        source: "current",
        path: "amortizationType",
      },
      {
        kind: "literal",
        value: "FRENCH",
      },
    ],
  },
  cases: [
    {
      when: {
        kind: "literal",
        value: "NONE",
      },
      then: {
        kind: "call",
        fn: "coalesce",
        args: [
          {
            kind: "field",
            source: "current",
            path: "principalPortion",
          },
          {
            kind: "literal",
            value: 0,
          },
        ],
      },
    },
    {
      when: {
        kind: "literal",
        value: "GERMAN",
      },
      then: {
        kind: "binary",
        op: "/",
        left: {
          kind: "formula",
          name: "loanPeriodBalance",
          inputs: {},
        },
        right: {
          kind: "formula",
          name: "loanTermMonths",
          inputs: {},
        },
      },
    },
    {
      when: {
        kind: "literal",
        value: "AMERICAN",
      },
      then: {
        kind: "call",
        fn: "if",
        args: [
          {
            kind: "formula",
            name: "loanIsLastPeriod",
            inputs: {},
          },
          {
            kind: "formula",
            name: "loanPeriodBalance",
            inputs: {},
          },
          {
            kind: "literal",
            value: 0,
          },
        ],
      },
    },
    {
      when: {
        kind: "literal",
        value: "BULLET",
      },
      then: {
        kind: "call",
        fn: "if",
        args: [
          {
            kind: "formula",
            name: "loanIsLastPeriod",
            inputs: {},
          },
          {
            kind: "formula",
            name: "loanPeriodBalance",
            inputs: {},
          },
          {
            kind: "literal",
            value: 0,
          },
        ],
      },
    },
  ],
  default: {
    kind: "binary",
    op: "-",
    left: {
      kind: "formula",
      name: "loanAnnuityPayment",
      inputs: {},
    },
    right: {
      kind: "formula",
      name: "loanInterestPayment",
      inputs: {},
    },
  },
};
