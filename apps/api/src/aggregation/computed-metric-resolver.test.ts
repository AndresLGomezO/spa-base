import { describe, expect, it, vi } from "vitest";

import { evaluateComputedMetricForUser } from "./computed-metric-resolver.js";

describe("evaluateComputedMetricForUser queryRef access", () => {
  const tenantId = "tenant_rates";
  const userId = "user_1";

  const definition = {
    id: "metric_due_today_count",
    tenantId,
    metricId: "due_today_count",
    name: "Due Today Count",
    computationMode: "computed" as const,
    sourceModel: "paymentSchedule",
    parameters: [
      {
        name: "period",
        valueType: "dateBucket" as const,
        granularity: "month" as const,
      },
    ],
    computation: {
      type: "expression" as const,
      inputs: {
        value: {
          type: "queryRef" as const,
          queryDefinitionId: "Upcoming payments (dashboard)",
          parameterMap: { period: "period" },
          aggregationOperation: "COUNT" as const,
        },
      },
      tokens: [{ type: "input" as const, name: "value" }],
    },
    aggregations: [{ operation: "COUNT" as const }],
    filters: [],
    groupBy: [],
    dimensions: [],
    dateFieldGranularity: {},
    valueDisplayFormat: "number" as const,
    version: 1,
    schemaVersionDependency: 0,
    fieldsDependency: [],
    status: "ACTIVE" as const,
    target: { collection: "metricValues_paymentSchedule" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const queryDefinition = {
    id: "query_upcoming_dashboard",
    tenantId,
    queryId: "upcoming_payments_dashboard",
    name: "Upcoming payments (dashboard)",
    sourceEntity: "paymentSchedule",
    queryMode: "records" as const,
    parameters: [
      {
        name: "period",
        valueType: "dateBucket" as const,
        granularity: "month" as const,
        field: "dueDate",
      },
    ],
    filter: {
      type: "group" as const,
      combinator: "and" as const,
      children: [
        {
          type: "condition" as const,
          field: "status",
          operator: "in" as const,
          value: {
            type: "static" as const,
            value: ["UPCOMING", "OVERDUE"],
          },
        },
        {
          type: "condition" as const,
          field: "financialItemId.flowKind",
          operator: "!=" as const,
          value: {
            type: "static" as const,
            value: "INCOME",
          },
        },
        {
          type: "condition" as const,
          field: "dueDate",
          operator: "<=" as const,
          value: {
            type: "parameter" as const,
            name: "period",
            bound: "end" as const,
          },
        },
      ],
    },
    sort: [],
    groupBy: [],
    aggregations: [],
    groupSort: [],
    limitMode: "all" as const,
    status: "ACTIVE" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  function createDeps(input: {
    readonly schedules: readonly Record<string, unknown>[];
    readonly financialItems?: readonly Record<string, unknown>[];
  }) {
    const scheduleRepository = {
      findAll: vi.fn(async () => ({
        items: input.schedules,
        nextCursor: null,
      })),
    };
    const financialItemRepository = {
      findAll: vi.fn(async () => ({
        items: input.financialItems ?? [
          { id: "fi_expense", flowKind: "EXPENSE" },
          { id: "fi_income", flowKind: "INCOME" },
        ],
        nextCursor: null,
      })),
    };

    return {
      scheduleRepository,
      financialItemRepository,
      deps: {
        entityRuntime: {
          getRepository: vi.fn((_tenant: string, entityName: string) => {
            if (entityName === "paymentSchedule") {
              return scheduleRepository;
            }
            if (entityName === "financialItem") {
              return financialItemRepository;
            }
            return undefined;
          }),
          getEntitiesForTenant: vi.fn(() => [
            {
              name: "paymentSchedule",
              metadata: {
                fields: {
                  status: { type: "enum" },
                  dueDate: { type: "date" },
                  expectedAmount: { type: "number" },
                  financialItemId: {
                    type: "relation",
                    relation: {
                      target: "financialItem",
                      type: "many-to-one",
                    },
                  },
                },
              },
            },
            {
              name: "financialItem",
              metadata: {
                fields: {
                  flowKind: {
                    type: "enum",
                    enumValues: [
                      "INCOME",
                      "EXPENSE",
                      "TRANSFER",
                      "ASSET_GROWTH",
                    ],
                  },
                },
              },
            },
          ]),
        },
        metricDefinitionRepository: {
          getById: vi.fn(async () => null),
          list: vi.fn(async () => [definition]),
        },
        entityQueryDefinitionRepository: {
          getById: vi.fn(async () => null),
          list: vi.fn(async () => [queryDefinition]),
        },
        metricValueRepository: {
          getById: vi.fn(async () => null),
        },
      },
    };
  }

  it("includes records reachable via accessUserIds even without matching ownerId", async () => {
    const { deps } = createDeps({
      schedules: [
        {
          id: "ps_1",
          tenantId,
          status: "OVERDUE",
          dueDate: "2026-06-15T00:00:00.000Z",
          expectedAmount: 100,
          financialItemId: "fi_expense",
          ownerId: "other_owner",
          accessUserIds: [userId, "other_owner"],
        },
      ],
    });

    const result = await evaluateComputedMetricForUser({
      tenantId,
      userId,
      definition: definition as never,
      providedParameters: { period: "2026-07" },
      ...deps,
    } as never);

    expect(result.values.primary).toBe(1);
  });

  it("returns 0 for COUNT when no records match", async () => {
    const { deps } = createDeps({ schedules: [] });

    const result = await evaluateComputedMetricForUser({
      tenantId,
      userId,
      definition: definition as never,
      providedParameters: { period: "2026-07" },
      ...deps,
    } as never);

    expect(result.values.primary).toBe(0);
  });

  it("expands relation filters once instead of per paymentSchedule row", async () => {
    const schedules = Array.from({ length: 8 }, (_, index) => ({
      id: `ps_${index}`,
      tenantId,
      status: "OVERDUE",
      dueDate: "2026-06-15T00:00:00.000Z",
      expectedAmount: 100,
      financialItemId: index % 2 === 0 ? "fi_expense" : "fi_income",
      ownerId: userId,
      accessUserIds: [userId],
    }));
    const { deps, financialItemRepository } = createDeps({ schedules });

    const result = await evaluateComputedMetricForUser({
      tenantId,
      userId,
      definition: definition as never,
      providedParameters: { period: "2026-07" },
      ...deps,
    } as never);

    expect(result.values.primary).toBe(4);
    expect(financialItemRepository.findAll).toHaveBeenCalledTimes(1);
  });
});

describe("evaluateComputedMetricForUser week temporal presets", () => {
  const tenantId = "tenant_rates";
  const userId = "user_1";

  // 2024-01-15 was a Monday → week is Jan 15–21 when period=2024-01
  const weekDefinition = {
    id: "metric_upcoming_this_week_count",
    tenantId,
    metricId: "upcoming_this_week_count",
    name: "Upcoming This Week Count",
    computationMode: "computed" as const,
    sourceModel: "paymentSchedule",
    parameters: [
      {
        name: "period",
        valueType: "dateBucket" as const,
        granularity: "month" as const,
      },
    ],
    computation: {
      type: "expression" as const,
      inputs: {
        value: {
          type: "queryRef" as const,
          queryDefinitionId: "Upcoming this week (metrics)",
          parameterMap: { period: "period" },
          aggregationOperation: "COUNT" as const,
        },
      },
      tokens: [{ type: "input" as const, name: "value" }],
    },
    aggregations: [{ operation: "COUNT" as const }],
    filters: [],
    groupBy: [],
    dimensions: [],
    dateFieldGranularity: {},
    valueDisplayFormat: "number" as const,
    version: 1,
    schemaVersionDependency: 0,
    fieldsDependency: ["dueDate", "status"],
    status: "ACTIVE" as const,
    target: { collection: "metricValues_paymentSchedule" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const weekQueryDefinition = {
    id: "query_upcoming_this_week",
    tenantId,
    queryId: "upcoming_this_week_metrics",
    name: "Upcoming this week (metrics)",
    sourceEntity: "paymentSchedule",
    queryMode: "records" as const,
    parameters: [],
    filter: {
      type: "group" as const,
      combinator: "and" as const,
      children: [
        {
          type: "condition" as const,
          field: "status",
          operator: "==" as const,
          value: { type: "static" as const, value: "UPCOMING" },
        },
        {
          type: "condition" as const,
          field: "financialItemId.flowKind",
          operator: "!=" as const,
          value: { type: "static" as const, value: "INCOME" },
        },
        {
          type: "condition" as const,
          field: "dueDate",
          operator: ">=" as const,
          value: { type: "temporal" as const, preset: "startOfWeek" as const },
        },
        {
          type: "condition" as const,
          field: "dueDate",
          operator: "<=" as const,
          value: { type: "temporal" as const, preset: "endOfWeek" as const },
        },
      ],
    },
    sort: [],
    groupBy: [],
    aggregations: [],
    groupSort: [],
    limitMode: "all" as const,
    status: "ACTIVE" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  function createWeekDeps(schedules: readonly Record<string, unknown>[]) {
    const scheduleRepository = {
      findAll: vi.fn(async () => ({
        items: schedules,
        nextCursor: null,
      })),
    };
    const financialItemRepository = {
      findAll: vi.fn(async () => ({
        items: [
          { id: "fi_expense", flowKind: "EXPENSE" },
          { id: "fi_income", flowKind: "INCOME" },
        ],
        nextCursor: null,
      })),
    };

    return {
      entityRuntime: {
        getRepository: vi.fn((_tenant: string, entityName: string) => {
          if (entityName === "paymentSchedule") {
            return scheduleRepository;
          }
          if (entityName === "financialItem") {
            return financialItemRepository;
          }
          return undefined;
        }),
        getEntitiesForTenant: vi.fn(() => [
          {
            name: "paymentSchedule",
            metadata: {
              fields: {
                status: { type: "enum" },
                dueDate: { type: "date" },
                expectedAmount: { type: "number" },
                financialItemId: {
                  type: "relation",
                  relation: {
                    target: "financialItem",
                    type: "many-to-one",
                  },
                },
              },
            },
          },
          {
            name: "financialItem",
            metadata: {
              fields: {
                flowKind: {
                  type: "enum",
                  enumValues: ["INCOME", "EXPENSE", "TRANSFER", "ASSET_GROWTH"],
                },
              },
            },
          },
        ]),
      },
      metricDefinitionRepository: {
        getById: vi.fn(async () => null),
        list: vi.fn(async () => [weekDefinition]),
      },
      entityQueryDefinitionRepository: {
        getById: vi.fn(async () => null),
        list: vi.fn(async () => [weekQueryDefinition]),
      },
      metricValueRepository: {
        getById: vi.fn(async () => null),
      },
    };
  }

  it("counts schedules in the week of the selected period, not wall-clock week", async () => {
    const deps = createWeekDeps([
      {
        id: "ps_in_jan_week",
        tenantId,
        status: "UPCOMING",
        dueDate: "2024-01-17",
        expectedAmount: 50,
        financialItemId: "fi_expense",
        ownerId: userId,
        accessUserIds: [userId],
      },
      {
        id: "ps_in_march_week",
        tenantId,
        status: "UPCOMING",
        dueDate: "2025-03-16",
        expectedAmount: 75,
        financialItemId: "fi_expense",
        ownerId: userId,
        accessUserIds: [userId],
      },
    ]);

    const january = await evaluateComputedMetricForUser({
      tenantId,
      userId,
      definition: weekDefinition as never,
      providedParameters: { period: "2024-01" },
      ...deps,
    } as never);
    expect(january.values.primary).toBe(1);

    const march = await evaluateComputedMetricForUser({
      tenantId,
      userId,
      definition: weekDefinition as never,
      providedParameters: { period: "2025-03" },
      ...deps,
    } as never);
    expect(march.values.primary).toBe(1);
  });
});
