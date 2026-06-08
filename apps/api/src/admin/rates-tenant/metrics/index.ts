import type { CreateMetricDefinitionInput } from "@repo/metrics-engine";

import {
  avgMetric,
  countMetric,
  DEBT_CONTRACT_TYPES,
  INVESTMENT_CONTRACT_TYPES,
  sumMetric,
} from "./helpers.js";

export function buildRatesMetricDefinitions(): readonly CreateMetricDefinitionInput[] {
  return [
    sumMetric({
      name: "Total Income (All Time)",
      description: "Total sum of all income transactions ever recorded.",
      sourceModel: "transaction",
      field: "amount",
      fieldsDependency: ["amount", "type"],
      filters: [{ field: "type", op: "eq", value: "INCOME" }],
      valueDisplayFormat: "currency",
    }),
    sumMetric({
      name: "Total Expenses (All Time)",
      description: "Total sum of all expense transactions ever recorded.",
      sourceModel: "transaction",
      field: "amount",
      fieldsDependency: ["amount", "type"],
      filters: [{ field: "type", op: "eq", value: "EXPENSE" }],
      valueDisplayFormat: "currency",
    }),
    sumMetric({
      name: "Income by Category (Current Month)",
      description:
        "Sum of income transactions grouped by category, bucketed by calendar month on date.",
      sourceModel: "transaction",
      field: "amount",
      fieldsDependency: ["amount", "type", "categoryId", "date"],
      filters: [{ field: "type", op: "eq", value: "INCOME" }],
      groupBy: ["categoryId"],
      dimensions: ["date"],
      dateFieldGranularity: { date: "month" },
      valueDisplayFormat: "currency",
    }),
    sumMetric({
      name: "Expenses by Category (Current Month)",
      description:
        "Sum of expense transactions grouped by category, bucketed by calendar month on date.",
      sourceModel: "transaction",
      field: "amount",
      fieldsDependency: ["amount", "type", "categoryId", "date"],
      filters: [{ field: "type", op: "eq", value: "EXPENSE" }],
      groupBy: ["categoryId"],
      dimensions: ["date"],
      dateFieldGranularity: { date: "month" },
      valueDisplayFormat: "currency",
    }),
    sumMetric({
      name: "Total Account Balances",
      description: "Sum of all account balances across all accounts.",
      sourceModel: "account",
      field: "balance",
      fieldsDependency: ["balance"],
      valueDisplayFormat: "currency",
    }),
    sumMetric({
      name: "Total Debt Balance",
      description:
        "Sum of current balances for active debt contracts (loans, credit cards, mortgages, etc.).",
      sourceModel: "contract",
      field: "currentBalance",
      fieldsDependency: [
        "currentBalance",
        "contractType",
        "status",
        "currency",
      ],
      filters: [
        { field: "status", op: "eq", value: "ACTIVE" },
        {
          field: "contractType",
          op: "in",
          value: [...DEBT_CONTRACT_TYPES],
        },
      ],
      groupBy: ["contractType"],
      dimensions: ["currency"],
      valueDisplayFormat: "currency",
    }),
    sumMetric({
      name: "Total Investment Value",
      description: "Sum of current balances for active investment contracts.",
      sourceModel: "contract",
      field: "currentBalance",
      fieldsDependency: [
        "currentBalance",
        "contractType",
        "status",
        "currency",
      ],
      filters: [
        { field: "status", op: "eq", value: "ACTIVE" },
        {
          field: "contractType",
          op: "in",
          value: [...INVESTMENT_CONTRACT_TYPES],
        },
      ],
      dimensions: ["currency"],
      valueDisplayFormat: "currency",
    }),
    countMetric({
      name: "Number of Active Subscriptions",
      description: "Count of active subscription contracts.",
      sourceModel: "contract",
      fieldsDependency: ["contractType", "status"],
      filters: [
        { field: "status", op: "eq", value: "ACTIVE" },
        { field: "contractType", op: "eq", value: "SUBSCRIPTION" },
      ],
    }),
    sumMetric({
      name: "Expected Monthly Income",
      description:
        "Sum of expected income from income detail records (active contracts).",
      sourceModel: "incomeDetails",
      field: "expectedAmount",
      fieldsDependency: ["expectedAmount", "contractId"],
      valueDisplayFormat: "currency",
    }),
    avgMetric({
      name: "Average Transaction Amount (by Type)",
      description:
        "Average transaction amount for each transaction type (INCOME, EXPENSE, etc.).",
      sourceModel: "transaction",
      field: "amount",
      fieldsDependency: ["amount", "type"],
      groupBy: ["type"],
      valueDisplayFormat: "currency",
    }),
    sumMetric({
      name: "Statement Paid Amount (by Month)",
      description:
        "Total paid amount on paid statements, grouped by statement period month.",
      sourceModel: "statement",
      field: "paidAmount",
      fieldsDependency: ["paidAmount", "periodStart", "status", "periodEnd"],
      filters: [{ field: "status", op: "eq", value: "PAID" }],
      groupBy: ["periodStart"],
      dimensions: ["periodEnd"],
      dateFieldGranularity: { periodStart: "month" },
      valueDisplayFormat: "currency",
    }),
    avgMetric({
      name: "Average Contract Interest Rate",
      description:
        "Average interest rate across contract terms (optionally by rate type).",
      sourceModel: "contractTerms",
      field: "interestRate",
      fieldsDependency: [
        "interestRate",
        "rateType",
        "effectiveDate",
        "contractId",
      ],
      groupBy: ["rateType"],
    }),
    countMetric({
      name: "Total Files per Document Type",
      description:
        "Count of uploaded files grouped by document type (RECEIPT, STATEMENT_PDF, etc.).",
      sourceModel: "file",
      fieldsDependency: ["documentType"],
      groupBy: ["documentType"],
    }),
  ];
}
