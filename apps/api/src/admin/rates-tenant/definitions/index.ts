import type { CreateEntityDefinitionInput } from "@repo/dynamic-entities";

import {
  booleanField,
  CURRENCY_ENUM_VALUES,
  dateOnlyField,
  decimalField,
  documentField,
  enumField,
  groupedDefinition,
  imageField,
  integerField,
  manyToManyRelationField,
  relationField,
  stringField,
  uncategorizedDefinition,
} from "./helpers.js";

export interface RatesNavCategoryIds {
  readonly contracts: string;
}

export const RATES_ENTITY_NAMES = [
  "category",
  "provider",
  "account",
  "contract",
  "incomeDetails",
  "subscriptionDetails",
  "investmentDetails",
  "contractTerms",
  "contractSnapshot",
  "transaction",
  "statement",
  "file",
] as const;

export const RATES_BUSINESS_ENTITY_NAMES = [
  "category",
  "provider",
  "account",
  "contract",
  "incomeDetails",
  "subscriptionDetails",
  "investmentDetails",
  "contractTerms",
  "contractSnapshot",
  "transaction",
  "statement",
  "file",
] as const;

export function buildRatesEntityDefinitions(
  categories: RatesNavCategoryIds,
): readonly CreateEntityDefinitionInput[] {
  const contracts = categories.contracts;

  return [
    uncategorizedDefinition({
      name: "category",
      label: "Categories",
      navOrder: 1,
      icon: "FolderTree",
      fields: [
        stringField("name", {
          required: true,
          label: "Name",
          sortable: true,
          filterable: false,
        }),
        enumField(
          "type",
          ["INCOME", "EXPENSE", "INVESTMENT", "SAVINGS", "DEBT"],
          { required: true, label: "Type", filterable: true },
        ),
        relationField("parentId", "category", {
          label: "Parent",
          filterable: true,
        }),
      ],
    }),
    uncategorizedDefinition({
      name: "provider",
      label: "Providers",
      navOrder: 2,
      icon: "Building2",
      fields: [
        stringField("name", {
          required: true,
          label: "Name",
          sortable: true,
          filterable: false,
        }),
        enumField(
          "type",
          [
            "BANK",
            "SERVICE",
            "EMPLOYER",
            "BROKER",
            "UTILITY",
            "INSURANCE",
            "TAX_AUTHORITY",
            "OTHER",
          ],
          { required: true, label: "Type", filterable: true },
        ),
        imageField("logo", { label: "Logo" }),
        stringField("website", { label: "Website" }),
      ],
    }),
    uncategorizedDefinition({
      name: "account",
      label: "Accounts",
      navOrder: 3,
      icon: "Landmark",
      fields: [
        stringField("name", {
          required: true,
          label: "Name",
          sortable: true,
          filterable: false,
        }),
        enumField(
          "accountType",
          ["BANK", "CASH", "BROKER", "CRYPTO_WALLET", "DIGITAL_WALLET"],
          { required: true, label: "Account type", filterable: true },
        ),
        relationField("providerId", "provider", {
          required: true,
          label: "Provider",
          filterable: true,
        }),
        enumField("currency", [...CURRENCY_ENUM_VALUES], {
          required: true,
          label: "Currency",
          filterable: true,
        }),
        decimalField("balance", {
          required: true,
          label: "Balance",
          sortable: true,
        }),
      ],
    }),
    groupedDefinition({
      name: "contract",
      label: "Contracts",
      navCategoryId: contracts,
      navOrder: 1,
      icon: "FileText",
      fields: [
        stringField("name", {
          required: true,
          label: "Name",
          sortable: true,
          filterable: false,
        }),
        enumField(
          "contractType",
          [
            "LOAN",
            "CREDIT_CARD",
            "MORTGAGE",
            "CAR_LOAN",
            "PERSONAL_LOAN",
            "INVESTMENT",
            "STOCK",
            "ETF",
            "BOND",
            "CRYPTO",
            "SAVINGS",
            "FIXED_TERM",
            "REAL_ESTATE",
            "BUSINESS",
            "BILL",
            "UTILITY",
            "TAX",
            "INSURANCE",
            "SUBSCRIPTION",
            "INCOME_SOURCE",
          ],
          { required: true, label: "Contract type", filterable: true },
        ),
        relationField("categoryId", "category", {
          required: true,
          label: "Category",
          filterable: true,
        }),
        relationField("providerId", "provider", {
          required: true,
          label: "Provider",
          filterable: true,
        }),
        enumField("currency", [...CURRENCY_ENUM_VALUES], {
          required: true,
          label: "Currency",
          filterable: true,
        }),
        decimalField("initialAmount", {
          required: true,
          label: "Initial amount",
          sortable: true,
        }),
        decimalField("currentBalance", {
          required: true,
          label: "Current balance",
          sortable: true,
        }),
        dateOnlyField("startDate", {
          required: true,
          label: "Start date",
          sortable: true,
        }),
        dateOnlyField("endDate", { label: "End date", sortable: true }),
        enumField(
          "status",
          ["ACTIVE", "INACTIVE", "CLOSED", "DEFAULTED", "PAUSED", "COMPLETED"],
          { required: true, label: "Status", filterable: true },
        ),
        stringField("description", { label: "Description" }),
        booleanField("isRecurring", {
          required: true,
          label: "Recurring",
          filterable: true,
        }),
        enumField(
          "frequency",
          [
            "DAILY",
            "WEEKLY",
            "BIWEEKLY",
            "MONTHLY",
            "BIMONTHLY",
            "QUARTERLY",
            "SEMIANNUAL",
            "ANNUAL",
            "IRREGULAR",
          ],
          { label: "Frequency", filterable: true },
        ),
        integerField("frequencyInDays", {
          label: "Frequency (days)",
          sortable: true,
        }),
        enumField("variability", ["FIXED", "VARIABLE"], {
          label: "Variability",
          filterable: true,
        }),
      ],
    }),
    groupedDefinition({
      name: "incomeDetails",
      label: "Income Details",
      navCategoryId: contracts,
      navOrder: 2,
      icon: "HandCoins",
      displayField: "name",
      fields: [
        stringField("name", {
          required: true,
          label: "Name",
          sortable: true,
          searchable: true,
        }),
        relationField("contractId", "contract", {
          required: true,
          label: "Contract",
          filterable: true,
        }),
        enumField(
          "incomeType",
          [
            "SALARY",
            "FREELANCE",
            "RENT",
            "DIVIDEND",
            "INTEREST",
            "BUSINESS",
            "CAPITAL_GAIN",
            "GIFT",
            "OTHER",
          ],
          { required: true, label: "Income type", filterable: true },
        ),
        decimalField("expectedAmount", {
          required: true,
          label: "Expected amount",
          sortable: true,
        }),
      ],
    }),
    groupedDefinition({
      name: "subscriptionDetails",
      label: "Subscription Details",
      navCategoryId: contracts,
      navOrder: 3,
      icon: "MonitorPlay",
      fields: [
        relationField("contractId", "contract", {
          required: true,
          label: "Contract",
          filterable: true,
        }),
        stringField("planName", {
          required: true,
          label: "Plan name",
          sortable: true,
          filterable: false,
        }),
        dateOnlyField("startDate", { label: "Start date", sortable: true }),
        dateOnlyField("nextBillingDate", {
          required: true,
          label: "Next billing date",
          sortable: true,
        }),
        booleanField("autoRenew", {
          required: true,
          label: "Auto renew",
          filterable: true,
        }),
      ],
    }),
    groupedDefinition({
      name: "investmentDetails",
      label: "Investment Details",
      navCategoryId: contracts,
      navOrder: 4,
      icon: "LineChart",
      fields: [
        relationField("contractId", "contract", {
          required: true,
          label: "Contract",
          filterable: true,
        }),
        decimalField("expectedReturnRate", {
          required: true,
          label: "Expected return rate",
          displayFormat: "percentage",
          sortable: true,
        }),
        enumField("riskLevel", ["LOW", "MEDIUM", "HIGH"], {
          required: true,
          label: "Risk level",
          filterable: true,
        }),
        enumField("liquidity", ["HIGH", "MEDIUM", "LOW"], {
          required: true,
          label: "Liquidity",
          filterable: true,
        }),
      ],
    }),
    groupedDefinition({
      name: "contractTerms",
      label: "Contract Terms",
      navCategoryId: contracts,
      navOrder: 5,
      icon: "ClipboardList",
      fields: [
        relationField("contractId", "contract", {
          required: true,
          label: "Contract",
          filterable: true,
        }),
        decimalField("interestRate", {
          required: true,
          label: "Interest rate",
          displayFormat: "percentage",
          sortable: true,
        }),
        enumField("rateType", ["FIXED", "VARIABLE", "MIXED"], {
          required: true,
          label: "Rate type",
          filterable: true,
        }),
        enumField(
          "compoundingFrequency",
          ["DAILY", "MONTHLY", "QUARTERLY", "ANNUAL", "CONTINUOUS"],
          { required: true, label: "Compounding frequency", filterable: true },
        ),
        decimalField("paymentAmount", {
          required: true,
          label: "Payment amount",
          sortable: true,
        }),
        enumField(
          "paymentFrequency",
          [
            "DAILY",
            "WEEKLY",
            "BIWEEKLY",
            "MONTHLY",
            "BIMONTHLY",
            "QUARTERLY",
            "SEMIANNUAL",
            "ANNUAL",
            "IRREGULAR",
          ],
          { required: true, label: "Payment frequency", filterable: true },
        ),
        integerField("totalPeriods", {
          required: true,
          label: "Total periods",
          sortable: true,
        }),
        enumField(
          "amortizationType",
          ["FRENCH", "GERMAN", "AMERICAN", "BULLET", "NONE"],
          { required: true, label: "Amortization type", filterable: true },
        ),
        integerField("gracePeriods", {
          label: "Grace periods",
          sortable: true,
        }),
        dateOnlyField("effectiveDate", {
          required: true,
          label: "Effective date",
          sortable: true,
        }),
      ],
    }),
    groupedDefinition({
      name: "contractSnapshot",
      label: "Contract Snapshots",
      navCategoryId: contracts,
      navOrder: 6,
      icon: "Camera",
      fields: [
        relationField("contractId", "contract", {
          required: true,
          label: "Contract",
          filterable: true,
        }),
        dateOnlyField("date", {
          required: true,
          label: "Date",
          sortable: true,
        }),
        decimalField("balance", {
          required: true,
          label: "Balance",
          sortable: true,
        }),
        decimalField("accruedInterest", {
          label: "Accrued interest",
          sortable: true,
        }),
      ],
    }),
    uncategorizedDefinition({
      name: "transaction",
      label: "Transactions",
      navOrder: 5,
      icon: "ArrowLeftRight",
      fields: [
        enumField(
          "type",
          [
            "INCOME",
            "EXPENSE",
            "TRANSFER",
            "PAYMENT",
            "INVESTMENT_BUY",
            "INVESTMENT_SELL",
            "INTEREST",
            "FEE",
            "TAX",
          ],
          { required: true, label: "Type", filterable: true },
        ),
        decimalField("amount", {
          required: true,
          label: "Amount",
          sortable: true,
        }),
        dateOnlyField("date", {
          required: true,
          label: "Date",
          sortable: true,
        }),
        relationField("accountId", "account", {
          required: true,
          label: "Account",
          filterable: true,
        }),
        relationField("contractId", "contract", {
          label: "Contract",
          filterable: true,
        }),
        relationField("categoryId", "category", {
          required: true,
          label: "Category",
          filterable: true,
        }),
        stringField("description", { label: "Description" }),
        manyToManyRelationField("sources", "incomeDetails", {
          label: "Income sources",
        }),
      ],
    }),
    groupedDefinition({
      name: "statement",
      label: "Statements",
      navCategoryId: contracts,
      navOrder: 7,
      icon: "Receipt",
      fields: [
        relationField("contractId", "contract", {
          required: true,
          label: "Contract",
          filterable: true,
        }),
        dateOnlyField("periodStart", {
          required: true,
          label: "Period start",
          sortable: true,
        }),
        dateOnlyField("periodEnd", {
          required: true,
          label: "Period end",
          sortable: true,
        }),
        decimalField("openingBalance", {
          required: true,
          label: "Opening balance",
          sortable: true,
        }),
        decimalField("closingBalance", {
          required: true,
          label: "Closing balance",
          sortable: true,
        }),
        decimalField("minimumPayment", {
          label: "Minimum payment",
          sortable: true,
        }),
        dateOnlyField("dueDate", {
          required: true,
          label: "Due date",
          sortable: true,
        }),
        decimalField("paidAmount", {
          label: "Paid amount",
          sortable: true,
        }),
        enumField("status", ["PENDING", "PAID", "OVERDUE", "PARTIALLY_PAID"], {
          required: true,
          label: "Status",
          filterable: true,
        }),
        manyToManyRelationField("transactions", "transaction", {
          label: "Transactions",
        }),
      ],
    }),
    uncategorizedDefinition({
      name: "file",
      label: "Files",
      navOrder: 6,
      icon: "Paperclip",
      fields: [
        enumField("parentType", ["CONTRACT", "TRANSACTION", "STATEMENT"], {
          required: true,
          label: "Parent type",
          filterable: true,
        }),
        relationField("contractId", "contract", {
          label: "Contract",
          filterable: true,
        }),
        relationField("transactionId", "transaction", {
          label: "Transaction",
          filterable: true,
        }),
        relationField("statementId", "statement", {
          label: "Statement",
          filterable: true,
        }),
        enumField(
          "documentType",
          ["RECEIPT", "STATEMENT_PDF", "CONTRACT_PDF", "OTHER"],
          { required: true, label: "Document type", filterable: true },
        ),
        stringField("name", {
          required: true,
          label: "Name",
          sortable: true,
          filterable: false,
        }),
        documentField("document", {
          required: true,
          label: "Document",
        }),
        dateOnlyField("uploadedAt", {
          required: true,
          label: "Uploaded at",
          sortable: true,
        }),
        stringField("tags", { label: "Tags (comma-separated)" }),
      ],
    }),
  ];
}
