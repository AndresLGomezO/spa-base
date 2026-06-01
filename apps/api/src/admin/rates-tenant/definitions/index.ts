import type { CreateEntityDefinitionInput } from "@repo/dynamic-entities";

import {
  booleanField,
  dateField,
  decimalField,
  documentField,
  imageField,
  integerField,
  lookupDefinition,
  relationField,
  stringField,
  visibleDefinition,
} from "./helpers.js";

export interface RatesNavCategoryIds {
  readonly referenceData: string;
  readonly portfolio: string;
  readonly transactions: string;
  readonly extensions: string;
}

export function buildRatesEntityDefinitions(
  categories: RatesNavCategoryIds,
): readonly CreateEntityDefinitionInput[] {
  const ref = categories.referenceData;
  const port = categories.portfolio;
  const txn = categories.transactions;
  const ext = categories.extensions;

  return [
    lookupDefinition({
      name: "productType",
      label: "Product Types",
      navCategoryId: ref,
      navOrder: 1,
      icon: "Tag",
      fields: [
        stringField("code", { required: true, label: "Code" }),
        stringField("name", { required: true, label: "Name" }),
        stringField("description", { label: "Description" }),
      ],
    }),
    lookupDefinition({
      name: "accountType",
      label: "Account Types",
      navCategoryId: ref,
      navOrder: 2,
      icon: "Landmark",
      fields: [
        stringField("code", { required: true, label: "Code" }),
        stringField("name", { required: true, label: "Name" }),
      ],
    }),
    lookupDefinition({
      name: "categoryType",
      label: "Category Types",
      navCategoryId: ref,
      navOrder: 3,
      icon: "FolderOpen",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    visibleDefinition({
      name: "category",
      label: "Categories",
      navCategoryId: ref,
      navOrder: 4,
      icon: "FolderTree",
      tenantWideRead: true,
      displayField: "name",
      fields: [
        stringField("name", { required: true, label: "Name" }),
        relationField("categoryTypeId", "categoryType", {
          required: true,
          label: "Type",
        }),
        relationField("parentId", "category", { label: "Parent" }),
      ],
    }),
    lookupDefinition({
      name: "frequency",
      label: "Frequencies",
      navCategoryId: ref,
      navOrder: 5,
      icon: "Clock",
      fields: [
        stringField("code", { required: true, label: "Code" }),
        integerField("daysInterval", { label: "Days interval" }),
      ],
    }),
    lookupDefinition({
      name: "status",
      label: "Statuses",
      navCategoryId: ref,
      navOrder: 6,
      icon: "CheckCircle",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "rateType",
      label: "Rate Types",
      navCategoryId: ref,
      navOrder: 7,
      icon: "Percent",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "compoundingFrequency",
      label: "Compounding Frequencies",
      navCategoryId: ref,
      navOrder: 8,
      icon: "RefreshCw",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "amortizationType",
      label: "Amortization Types",
      navCategoryId: ref,
      navOrder: 9,
      icon: "Calculator",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "transactionType",
      label: "Transaction Types",
      navCategoryId: ref,
      navOrder: 10,
      icon: "ArrowLeftRight",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "cashflowDirection",
      label: "Cashflow Directions",
      navCategoryId: ref,
      navOrder: 11,
      icon: "TrendingUp",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "incomeType",
      label: "Income Types",
      navCategoryId: ref,
      navOrder: 12,
      icon: "DollarSign",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "variabilityType",
      label: "Variability Types",
      navCategoryId: ref,
      navOrder: 13,
      icon: "Sliders",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "riskLevel",
      label: "Risk Levels",
      navCategoryId: ref,
      navOrder: 14,
      icon: "Shield",
      fields: [stringField("code", { required: true, label: "Code" })],
    }),
    lookupDefinition({
      name: "currency",
      label: "Currencies",
      navCategoryId: ref,
      navOrder: 15,
      icon: "CurrencyDollar",
      fields: [
        stringField("code", { required: true, label: "Code" }),
        stringField("name", { required: true, label: "Name" }),
      ],
    }),
    lookupDefinition({
      name: "bank",
      label: "Banks",
      navCategoryId: ref,
      navOrder: 16,
      icon: "Landmark",
      fields: [
        stringField("code", { required: true, label: "Code" }),
        stringField("name", { required: true, label: "Name" }),
        imageField("logo", { label: "Logo" }),
      ],
    }),
    lookupDefinition({
      name: "serviceProvider",
      label: "Service Providers",
      navCategoryId: ref,
      navOrder: 17,
      icon: "Tv",
      fields: [
        stringField("code", { required: true, label: "Code" }),
        stringField("name", { required: true, label: "Name" }),
        imageField("logo", { label: "Logo" }),
      ],
    }),
    visibleDefinition({
      name: "account",
      label: "Accounts",
      navCategoryId: port,
      navOrder: 1,
      icon: "Building2",
      displayField: "name",
      fields: [
        stringField("name", { required: true, label: "Name" }),
        relationField("accountTypeId", "accountType", {
          required: true,
          label: "Account type",
        }),
        relationField("currencyId", "currency", {
          required: true,
          label: "Currency",
        }),
        relationField("bankId", "bank", { label: "Bank" }),
        decimalField("balance", {
          required: true,
          sensitive: true,
          displayFormat: "currency",
          label: "Balance",
        }),
      ],
    }),
    visibleDefinition({
      name: "financialProduct",
      label: "Financial Products",
      navCategoryId: port,
      navOrder: 2,
      icon: "Briefcase",
      displayField: "name",
      fields: [
        stringField("name", { required: true, label: "Name" }),
        relationField("productTypeId", "productType", {
          required: true,
          label: "Product type",
        }),
        relationField("categoryId", "category", {
          required: true,
          label: "Category",
        }),
        relationField("currencyId", "currency", {
          required: true,
          label: "Currency",
        }),
        decimalField("initialAmount", {
          required: true,
          sensitive: true,
          displayFormat: "currency",
          label: "Initial amount",
        }),
        decimalField("currentBalance", {
          required: true,
          sensitive: true,
          displayFormat: "currency",
          label: "Current balance",
        }),
        dateField("startDate", {
          required: true,
          label: "Start date",
          dateDisplayFormat: "date",
        }),
        dateField("endDate", { label: "End date", dateDisplayFormat: "date" }),
        relationField("statusId", "status", {
          required: true,
          label: "Status",
        }),
        relationField("bankId", "bank", { label: "Bank" }),
        relationField("serviceProviderId", "serviceProvider", {
          label: "Service provider",
        }),
        stringField("description", { label: "Description" }),
      ],
    }),
    visibleDefinition({
      name: "productTerm",
      label: "Product Terms",
      navCategoryId: port,
      navOrder: 3,
      icon: "FileText",
      displayField: "productId",
      fields: [
        relationField("productId", "financialProduct", {
          required: true,
          label: "Product",
        }),
        decimalField("interestRate", {
          required: true,
          sensitive: true,
          displayFormat: "percentage",
          label: "Interest rate",
        }),
        relationField("rateTypeId", "rateType", {
          required: true,
          label: "Rate type",
        }),
        relationField("compoundingFrequencyId", "compoundingFrequency", {
          required: true,
          label: "Compounding",
        }),
        decimalField("paymentAmount", {
          required: true,
          sensitive: true,
          displayFormat: "currency",
          label: "Payment amount",
        }),
        relationField("paymentFrequencyId", "frequency", {
          required: true,
          label: "Payment frequency",
        }),
        integerField("totalPeriods", {
          required: true,
          label: "Total periods",
        }),
        relationField("amortizationTypeId", "amortizationType", {
          required: true,
          label: "Amortization",
        }),
        integerField("gracePeriods", { label: "Grace periods" }),
      ],
    }),
    visibleDefinition({
      name: "productSnapshot",
      label: "Product Snapshots",
      navCategoryId: port,
      navOrder: 4,
      icon: "Camera",
      fields: [
        relationField("productId", "financialProduct", {
          required: true,
          label: "Product",
        }),
        dateField("date", {
          required: true,
          label: "Date",
          dateDisplayFormat: "date",
        }),
        decimalField("balance", {
          required: true,
          sensitive: true,
          displayFormat: "currency",
          label: "Balance",
        }),
        decimalField("accruedInterest", {
          sensitive: true,
          displayFormat: "currency",
          label: "Accrued interest",
        }),
        documentField("statement", { label: "Statement" }),
      ],
    }),
    visibleDefinition({
      name: "transaction",
      label: "Transactions",
      navCategoryId: txn,
      navOrder: 1,
      icon: "Receipt",
      fields: [
        relationField("productId", "financialProduct", { label: "Product" }),
        relationField("accountId", "account", {
          required: true,
          label: "Account",
        }),
        relationField("transactionTypeId", "transactionType", {
          required: true,
          label: "Type",
        }),
        decimalField("amount", {
          required: true,
          sensitive: true,
          displayFormat: "currency",
          label: "Amount",
        }),
        dateField("date", {
          required: true,
          label: "Date",
          dateDisplayFormat: "datetime",
        }),
        relationField("categoryId", "category", {
          required: true,
          label: "Category",
        }),
        stringField("description", { label: "Description" }),
      ],
    }),
    visibleDefinition({
      name: "transactionSource",
      label: "Transaction Sources",
      navCategoryId: txn,
      navOrder: 2,
      icon: "Link",
      fields: [
        relationField("transactionId", "transaction", {
          required: true,
          label: "Transaction",
        }),
        relationField("sourceProductId", "financialProduct", {
          required: true,
          label: "Source product",
        }),
        decimalField("percentage", {
          required: true,
          displayFormat: "percentage",
          label: "Percentage",
        }),
      ],
    }),
    visibleDefinition({
      name: "cashflow",
      label: "Cashflows",
      navCategoryId: txn,
      navOrder: 3,
      icon: "Activity",
      fields: [
        relationField("transactionId", "transaction", {
          required: true,
          label: "Transaction",
        }),
        relationField("directionId", "cashflowDirection", {
          required: true,
          label: "Direction",
        }),
        booleanField("recurring", { required: true, label: "Recurring" }),
        relationField("frequencyId", "frequency", {
          required: true,
          label: "Frequency",
        }),
        relationField("variabilityTypeId", "variabilityType", {
          required: true,
          label: "Variability",
        }),
      ],
    }),
    visibleDefinition({
      name: "incomeDetail",
      label: "Income Details",
      navCategoryId: ext,
      navOrder: 1,
      icon: "HandCoins",
      fields: [
        relationField("productId", "financialProduct", {
          required: true,
          label: "Product",
        }),
        relationField("incomeTypeId", "incomeType", {
          required: true,
          label: "Income type",
        }),
        decimalField("expectedAmount", {
          required: true,
          sensitive: true,
          displayFormat: "currency",
          label: "Expected amount",
        }),
        relationField("variabilityTypeId", "variabilityType", {
          required: true,
          label: "Variability",
        }),
        relationField("frequencyId", "frequency", {
          required: true,
          label: "Frequency",
        }),
      ],
    }),
    visibleDefinition({
      name: "subscriptionDetail",
      label: "Subscription Details",
      navCategoryId: ext,
      navOrder: 2,
      icon: "MonitorPlay",
      fields: [
        relationField("productId", "financialProduct", {
          required: true,
          label: "Product",
        }),
        relationField("serviceProviderId", "serviceProvider", {
          required: true,
          label: "Service provider",
        }),
        stringField("planName", { required: true, label: "Plan" }),
        relationField("billingFrequencyId", "frequency", {
          required: true,
          label: "Billing frequency",
        }),
        dateField("nextBillingDate", {
          required: true,
          label: "Next billing date",
          dateDisplayFormat: "date",
        }),
        booleanField("autoRenew", { required: true, label: "Auto renew" }),
      ],
    }),
    visibleDefinition({
      name: "investmentDetail",
      label: "Investment Details",
      navCategoryId: ext,
      navOrder: 3,
      icon: "LineChart",
      fields: [
        relationField("productId", "financialProduct", {
          required: true,
          label: "Product",
        }),
        decimalField("expectedReturnRate", {
          required: true,
          sensitive: true,
          displayFormat: "percentage",
          label: "Expected return",
        }),
        relationField("riskLevelId", "riskLevel", {
          required: true,
          label: "Risk level",
        }),
        stringField("liquidity", { required: true, label: "Liquidity" }),
      ],
    }),
  ];
}

export const RATES_ENTITY_NAMES = [
  "productType",
  "accountType",
  "categoryType",
  "category",
  "frequency",
  "status",
  "rateType",
  "compoundingFrequency",
  "amortizationType",
  "transactionType",
  "cashflowDirection",
  "incomeType",
  "variabilityType",
  "riskLevel",
  "currency",
  "bank",
  "serviceProvider",
  "account",
  "financialProduct",
  "productTerm",
  "productSnapshot",
  "transaction",
  "transactionSource",
  "cashflow",
  "incomeDetail",
  "subscriptionDetail",
  "investmentDetail",
] as const;

export const RATES_BUSINESS_ENTITY_NAMES = [
  "account",
  "financialProduct",
  "productTerm",
  "productSnapshot",
  "transaction",
  "transactionSource",
  "cashflow",
  "incomeDetail",
  "subscriptionDetail",
  "investmentDetail",
] as const;
