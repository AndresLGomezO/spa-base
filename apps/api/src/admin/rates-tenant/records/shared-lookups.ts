import type { RatesRecordSeedContext } from "../seed-helpers.js";
import { ensureRatesRecordInContext } from "../seed-helpers.js";
import { uploadRatesEntityLogo } from "../seed-rates-logos.js";

async function seedLookupWithLogo(
  context: RatesRecordSeedContext,
  params: {
    readonly entityName: "bank" | "serviceProvider";
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly assetFileName: string;
  },
): Promise<void> {
  const logo = await uploadRatesEntityLogo(context, {
    entityName: params.entityName,
    recordId: params.id,
    assetFileName: params.assetFileName,
  });

  await ensureRatesRecordInContext(context, params.entityName, params.id, {
    code: params.code,
    name: params.name,
    ...(logo ? { logo } : {}),
  });
}

export async function seedSharedLookupRecords(
  context: RatesRecordSeedContext,
): Promise<void> {
  const ensure = (
    entityName: string,
    id: string,
    data: Record<string, unknown>,
  ) => ensureRatesRecordInContext(context, entityName, id, data);

  await ensure("productType", "ptype_loan", {
    code: "LOAN",
    name: "Loan",
    description: "Debt-based product",
  });
  await ensure("productType", "ptype_credit_card", {
    code: "CREDIT_CARD",
    name: "Credit Card",
    description: "Revolving credit line",
  });
  await ensure("productType", "ptype_subscription", {
    code: "SUBSCRIPTION",
    name: "Subscription",
    description: "Recurring service billing",
  });
  await ensure("productType", "ptype_investment", {
    code: "INVESTMENT",
    name: "Investment",
    description: "Capital growth instrument",
  });
  await ensure("productType", "ptype_income", {
    code: "INCOME",
    name: "Income",
    description: "Salary or recurring income",
  });

  await ensure("accountType", "atype_bank", {
    code: "BANK",
    name: "Bank Account",
  });
  await ensure("accountType", "atype_wallet", {
    code: "WALLET",
    name: "Digital Wallet",
  });
  await ensure("accountType", "atype_credit", {
    code: "CREDIT",
    name: "Credit Line",
  });

  await ensure("categoryType", "ctype_expense", { code: "EXPENSE" });
  await ensure("categoryType", "ctype_income", { code: "INCOME" });

  await ensure("frequency", "freq_monthly", {
    code: "MONTHLY",
    daysInterval: 30,
  });
  await ensure("frequency", "freq_biweekly", {
    code: "BIWEEKLY",
    daysInterval: 14,
  });
  await ensure("frequency", "freq_annual", {
    code: "ANNUAL",
    daysInterval: 365,
  });

  await ensure("status", "status_active", { code: "ACTIVE" });
  await ensure("status", "status_closed", { code: "CLOSED" });
  await ensure("status", "status_delinquent", { code: "DELINQUENT" });

  await ensure("rateType", "rate_fixed", { code: "FIXED" });
  await ensure("rateType", "rate_variable", { code: "VARIABLE" });

  await ensure("compoundingFrequency", "comp_monthly", { code: "MONTHLY" });
  await ensure("compoundingFrequency", "comp_daily", { code: "DAILY" });

  await ensure("amortizationType", "amort_french", { code: "FRENCH" });
  await ensure("amortizationType", "amort_german", { code: "GERMAN" });

  await ensure("transactionType", "txn_payment", { code: "PAYMENT" });
  await ensure("transactionType", "txn_income", { code: "INCOME" });
  await ensure("transactionType", "txn_expense", { code: "EXPENSE" });
  await ensure("transactionType", "txn_transfer", { code: "TRANSFER" });

  await ensure("cashflowDirection", "dir_in", { code: "INFLOW" });
  await ensure("cashflowDirection", "dir_out", { code: "OUTFLOW" });

  await ensure("incomeType", "inc_salary", { code: "SALARY" });
  await ensure("incomeType", "inc_freelance", { code: "FREELANCE" });

  await ensure("variabilityType", "var_fixed", { code: "FIXED" });
  await ensure("variabilityType", "var_variable", { code: "VARIABLE" });

  await ensure("riskLevel", "risk_level_low", { code: "LOW" });
  await ensure("riskLevel", "risk_level_medium", { code: "MEDIUM" });
  await ensure("riskLevel", "risk_level_high", { code: "HIGH" });

  await ensure("currency", "currency_cop", {
    code: "COP",
    name: "Colombian Peso",
  });
  await ensure("currency", "currency_usd", {
    code: "USD",
    name: "US Dollar",
  });

  await seedLookupWithLogo(context, {
    entityName: "bank",
    id: "bank_bancolombia",
    code: "BANCOLOMBIA",
    name: "Bancolombia",
    assetFileName: "bancolombia.png",
  });
  await seedLookupWithLogo(context, {
    entityName: "bank",
    id: "bank_davivienda",
    code: "DAVIVIENDA",
    name: "Davivienda",
    assetFileName: "davivienda.webp",
  });
  await seedLookupWithLogo(context, {
    entityName: "bank",
    id: "bank_bbva",
    code: "BBVA",
    name: "BBVA Colombia",
    assetFileName: "bbva.png",
  });
  await seedLookupWithLogo(context, {
    entityName: "bank",
    id: "bank_scotiabank",
    code: "SCOTIABANK",
    name: "Scotiabank Colpatria",
    assetFileName: "scotiabank.png",
  });
  await seedLookupWithLogo(context, {
    entityName: "bank",
    id: "bank_banco_bogota",
    code: "BANCO_BOGOTA",
    name: "Banco de Bogotá",
    assetFileName: "banco-bogota.png",
  });

  await seedLookupWithLogo(context, {
    entityName: "serviceProvider",
    id: "sp_netflix",
    code: "NETFLIX",
    name: "Netflix",
    assetFileName: "netflix.png",
  });
  await seedLookupWithLogo(context, {
    entityName: "serviceProvider",
    id: "sp_spotify",
    code: "SPOTIFY",
    name: "Spotify",
    assetFileName: "spotify.png",
  });
  await seedLookupWithLogo(context, {
    entityName: "serviceProvider",
    id: "sp_disney_plus",
    code: "DISNEY_PLUS",
    name: "Disney+",
    assetFileName: "disney-plus.png",
  });
}
