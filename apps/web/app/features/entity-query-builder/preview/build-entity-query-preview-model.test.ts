import { describe, expect, it } from "vitest";

import {
  createEmptyEntityQueryFilterCondition,
  createEmptyEntityQueryFilterGroup,
  createEmptyEntityQueryFilterRoot,
} from "../../../components/entity/entity-query-filter-utils.js";
import type { EntityQueryDraftState } from "../use-entity-query-builder-editor.js";
import { buildEntityQueryPreviewModel } from "./build-entity-query-preview-model.js";
import type { EntityQueryPreviewBuildContext } from "./entity-query-preview-types.js";

function mockContext(
  overrides: Partial<EntityQueryPreviewBuildContext> = {},
): EntityQueryPreviewBuildContext {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (options) {
      return `${key}:${JSON.stringify(options)}`;
    }
    return key;
  };
  return {
    entityName: "payment",
    entityLabel: (name) => name,
    fieldLabel: (_entity, field) => field,
    t,
    ...overrides,
  };
}

const baseDraft: EntityQueryDraftState = {
  description: "Upcoming payments",
  queryMode: "records",
  parameters: [],
  filter: createEmptyEntityQueryFilterRoot(),
  sort: [],
  select: [],
  groupBy: [],
  aggregations: [],
  groupSort: [],
  limitMode: "topN",
  limit: 20,
  status: "ACTIVE",
};

describe("buildEntityQueryPreviewModel", () => {
  it("builds records query flow steps", () => {
    const filter = createEmptyEntityQueryFilterRoot();
    const condition = createEmptyEntityQueryFilterCondition();
    const draft: EntityQueryDraftState = {
      ...baseDraft,
      filter: {
        ...filter,
        children: [
          {
            ...condition,
            field: "status",
            operator: "==",
            scalarValue: "PAID",
          },
        ],
      },
      sort: [
        {
          id: "sort-1",
          field: "dueDate",
          direction: "asc",
        },
      ],
    };

    const model = buildEntityQueryPreviewModel(
      {
        name: "Upcoming payments",
        description: "Upcoming payments",
        sourceEntity: "payment",
        draft,
        status: "ACTIVE",
      },
      mockContext(),
    );

    expect(model.queryMode).toBe("records");
    expect(model.steps.map((step) => step.kind)).toEqual([
      "source",
      "filter",
      "sort",
      "limit",
      "output",
    ]);
    expect(model.steps[0]?.summary).toContain(
      "queryBuilder.howItWorks.records.source",
    );
    expect(model.steps[1]?.bullets?.[0]).toContain(
      "queryBuilder.howItWorks.filters.condition",
    );
  });

  it("builds aggregated query flow steps", () => {
    const draft: EntityQueryDraftState = {
      ...baseDraft,
      queryMode: "aggregated",
      groupBy: ["category"],
      aggregations: [
        {
          id: "agg-1",
          operation: "SUM",
          field: "amount",
        },
      ],
      limitMode: "all",
    };

    const model = buildEntityQueryPreviewModel(
      {
        name: "Totals by category",
        sourceEntity: "payment",
        draft,
        status: "ACTIVE",
      },
      mockContext(),
    );

    expect(model.queryMode).toBe("aggregated");
    expect(model.steps.map((step) => step.kind)).toEqual([
      "source",
      "groupBy",
      "aggregations",
      "output",
    ]);
    expect(model.steps[1]?.summary).toContain(
      "queryBuilder.howItWorks.aggregated.groupBySummary",
    );
    expect(model.steps[2]?.bullets?.[0]).toContain(
      "queryBuilder.howItWorks.aggregated.aggregation.SUM",
    );
    expect(model.steps[2]?.bullets?.[0]).toContain("sum_amount");
  });

  it("includes parameter step when parameters are declared", () => {
    const draft: EntityQueryDraftState = {
      ...baseDraft,
      parameters: [
        {
          id: "param-1",
          name: "period",
          valueType: "dateBucket",
          granularity: "month",
          field: "dueDate",
        },
      ],
    };

    const model = buildEntityQueryPreviewModel(
      {
        name: "Filtered by period",
        sourceEntity: "payment",
        draft,
        status: "ACTIVE",
      },
      mockContext(),
    );

    expect(model.steps.map((step) => step.kind)).toContain("parameters");
    expect(model.metaChips).toContain(
      'queryBuilder.howItWorks.meta.parameters:{"count":1}',
    );
  });

  it("formats nested filter groups", () => {
    const draft: EntityQueryDraftState = {
      ...baseDraft,
      filter: {
        ...createEmptyEntityQueryFilterGroup("or"),
        children: [
          {
            ...createEmptyEntityQueryFilterCondition(),
            field: "status",
            operator: "==",
            scalarValue: "PAID",
          },
          {
            ...createEmptyEntityQueryFilterGroup("and"),
            children: [
              {
                ...createEmptyEntityQueryFilterCondition(),
                field: "amount",
                operator: ">",
                scalarValue: "100",
              },
            ],
          },
        ],
      },
    };

    const model = buildEntityQueryPreviewModel(
      {
        name: "Complex filters",
        sourceEntity: "payment",
        draft,
        status: "ACTIVE",
      },
      mockContext(),
    );

    const filterStep = model.steps.find((step) => step.kind === "filter");
    expect(
      filterStep?.bullets?.some((line) => line.includes("combinator.or")),
    ).toBe(true);
  });
});
