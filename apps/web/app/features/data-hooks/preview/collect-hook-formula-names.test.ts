import { describe, expect, it } from "vitest";

import {
  collectFormulaNamesInAction,
  collectFormulaNamesInCondition,
} from "./collect-hook-formula-names";

describe("collectFormulaNamesInCondition", () => {
  it("collects formula names from condition leaf values", () => {
    const names = collectFormulaNamesInCondition({
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "status",
          operator: "==",
          value: {
            kind: "formula",
            name: "balanceSheetRoleFromItemType",
            inputs: {
              itemType: { kind: "field", source: "current", path: "itemType" },
            },
          },
        },
      ],
    });

    expect(names).toEqual(["balanceSheetRoleFromItemType"]);
  });

  it("deduplicates formula names across nested groups", () => {
    const names = collectFormulaNamesInCondition({
      type: "group",
      combinator: "or",
      children: [
        {
          type: "condition",
          field: "a",
          operator: "==",
          value: {
            kind: "formula",
            name: "paymentScheduleDueDate",
            inputs: {},
          },
        },
        {
          type: "group",
          combinator: "and",
          children: [
            {
              type: "condition",
              field: "b",
              operator: "==",
              value: {
                kind: "formula",
                name: "paymentScheduleDueDate",
                inputs: {},
              },
            },
          ],
        },
      ],
    });

    expect(names).toEqual(["paymentScheduleDueDate"]);
  });
});

describe("collectFormulaNamesInAction", () => {
  it("collects formula names from createRecords count and data", () => {
    const names = collectFormulaNamesInAction({
      type: "createRecords",
      entity: "paymentSchedule",
      count: {
        kind: "formula",
        name: "recurringScheduleInitialRowCount",
        inputs: {},
      },
      data: {
        dueDate: {
          kind: "formula",
          name: "frequencyScheduleDueDate",
          inputs: {},
        },
        amount: { kind: "literal", value: 100 },
      },
    });

    expect(names).toEqual([
      "recurringScheduleInitialRowCount",
      "frequencyScheduleDueDate",
    ]);
  });

  it("returns empty list when action has no formulas", () => {
    const names = collectFormulaNamesInAction({
      type: "setField",
      field: "status",
      value: { kind: "literal", value: "active" },
    });

    expect(names).toEqual([]);
  });
});
