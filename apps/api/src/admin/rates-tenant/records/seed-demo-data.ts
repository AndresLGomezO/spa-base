import {
  ensureRatesRecord,
  type RatesRecordSeedContext,
} from "../seed-record-helpers.js";
import type { SeedPaymentScheduleHookTarget } from "../seed-replay-payment-schedule-hooks.js";

const CURRENCY = "USD" as const;

function monthDate(day: number): string {
  return `2026-07-${String(day).padStart(2, "0")}`;
}

function priorMonthDate(day: number): string {
  return `2026-06-${String(day).padStart(2, "0")}`;
}

export async function seedRatesDemoRecords(
  context: RatesRecordSeedContext,
): Promise<SeedPaymentScheduleHookTarget> {
  const actors = [
    { id: "rd_actor_metro_bank", name: "Metro Bank", type: "BANK" },
    { id: "rd_actor_north_cu", name: "North Credit Union", type: "BANK" },
    {
      id: "rd_actor_rental_a",
      name: "Rental Property A",
      type: "PROPERTY",
    },
    {
      id: "rd_actor_rental_b",
      name: "Rental Property B",
      type: "PROPERTY",
    },
    {
      id: "rd_actor_employer",
      name: "Example Employer",
      type: "EMPLOYER",
    },
    { id: "rd_actor_utility", name: "City Power", type: "UTILITY" },
    { id: "rd_actor_person", name: "Example Person", type: "PERSON" },
    {
      id: "rd_actor_fiduciary",
      name: "Demo Fiduciary",
      type: "FIDUCIARY",
    },
  ] as const;

  for (const actor of actors) {
    await ensureRatesRecord(context, "actor", actor.id, {
      name: actor.name,
      type: actor.type,
    });
  }

  const categories = [
    { id: "rd_cat_housing", name: "Housing", kind: "EXPENSE" },
    { id: "rd_cat_utilities", name: "Utilities", kind: "EXPENSE" },
    { id: "rd_cat_income", name: "Income", kind: "INCOME" },
    { id: "rd_cat_investments", name: "Investments", kind: "INVESTMENT" },
    { id: "rd_cat_debt", name: "Debt", kind: "EXPENSE" },
    { id: "rd_cat_transfers", name: "Transfers", kind: "TRANSFER" },
    { id: "rd_cat_insurance", name: "Insurance", kind: "EXPENSE" },
    { id: "rd_cat_other", name: "Other", kind: "EXPENSE" },
  ] as const;

  for (const category of categories) {
    await ensureRatesRecord(context, "category", category.id, {
      name: category.name,
      kind: category.kind,
    });
  }

  const accounts = [
    {
      id: "rd_acct_checking",
      name: "Primary Checking",
      accountType: "BANK",
      actorId: "rd_actor_metro_bank",
      currentBalance: 12500,
    },
    {
      id: "rd_acct_savings",
      name: "Emergency Savings",
      accountType: "SAVINGS",
      actorId: "rd_actor_metro_bank",
      currentBalance: 45000,
    },
  ] as const;

  for (const account of accounts) {
    await ensureRatesRecord(context, "account", account.id, {
      name: account.name,
      accountType: account.accountType,
      actorId: account.actorId,
      currency: CURRENCY,
      currentBalance: account.currentBalance,
    });
  }

  type FinancialItemSeed = {
    readonly id: string;
    readonly name: string;
    readonly flowKind: string;
    readonly itemType: string;
    readonly amount: number;
    readonly isRecurring: boolean;
    readonly frequency: string;
    readonly nextDueDate: string;
    readonly currentBalance: number;
    readonly balanceSheetRole: string;
    readonly status: string;
    readonly categoryId: string;
    readonly actorId: string;
    readonly accountId: string;
  };

  const financialItems: readonly FinancialItemSeed[] = [
    {
      id: "rd_fi_mortgage",
      name: "Primary Mortgage",
      flowKind: "EXPENSE",
      itemType: "MORTGAGE",
      amount: 1850,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(5),
      currentBalance: 250000,
      balanceSheetRole: "LIABILITY",
      status: "ACTIVE",
      categoryId: "rd_cat_debt",
      actorId: "rd_actor_metro_bank",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_credit_card",
      name: "Rewards Credit Card",
      flowKind: "EXPENSE",
      itemType: "CREDIT_CARD",
      amount: 450,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(12),
      currentBalance: 3200,
      balanceSheetRole: "LIABILITY",
      status: "ACTIVE",
      categoryId: "rd_cat_debt",
      actorId: "rd_actor_north_cu",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_salary",
      name: "Monthly Salary",
      flowKind: "INCOME",
      itemType: "SALARY",
      amount: 6500,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(1),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_income",
      actorId: "rd_actor_employer",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_rental_a",
      name: "Rental Income A",
      flowKind: "INCOME",
      itemType: "RENTAL_INCOME",
      amount: 2200,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(3),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_income",
      actorId: "rd_actor_rental_a",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_rental_b",
      name: "Rental Income B",
      flowKind: "INCOME",
      itemType: "RENTAL_INCOME",
      amount: 1800,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(8),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_income",
      actorId: "rd_actor_rental_b",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_electric",
      name: "Electric Utility",
      flowKind: "EXPENSE",
      itemType: "UTILITY",
      amount: 140,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(18),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_utilities",
      actorId: "rd_actor_utility",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_hoa_a",
      name: "Property A HOA Fee",
      flowKind: "EXPENSE",
      itemType: "HOUSING_FEE",
      amount: 350,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(15),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_housing",
      actorId: "rd_actor_rental_a",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_savings_plan",
      name: "Monthly Savings Transfer",
      flowKind: "TRANSFER",
      itemType: "TO_SAVINGS",
      amount: 500,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(2),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_transfers",
      actorId: "rd_actor_metro_bank",
      accountId: "rd_acct_savings",
    },
    {
      id: "rd_fi_yield_savings",
      name: "High-Yield Savings",
      flowKind: "ASSET_GROWTH",
      itemType: "YIELD_SAVINGS",
      amount: 500,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(10),
      currentBalance: 45000,
      balanceSheetRole: "ASSET",
      status: "ACTIVE",
      categoryId: "rd_cat_investments",
      actorId: "rd_actor_metro_bank",
      accountId: "rd_acct_savings",
    },
    {
      id: "rd_fi_fiduciary",
      name: "Managed Investment Account",
      flowKind: "ASSET_GROWTH",
      itemType: "FIDUCIARY",
      amount: 1000,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(20),
      currentBalance: 75000,
      balanceSheetRole: "ASSET",
      status: "ACTIVE",
      categoryId: "rd_cat_investments",
      actorId: "rd_actor_fiduciary",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_yield_income",
      name: "Savings Yield Income",
      flowKind: "INCOME",
      itemType: "YIELD_INCOME",
      amount: 375,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(11),
      currentBalance: 45000,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_income",
      actorId: "rd_actor_metro_bank",
      accountId: "rd_acct_savings",
    },
    {
      id: "rd_fi_personal_loan",
      name: "Personal Loan Payoff",
      flowKind: "EXPENSE",
      itemType: "PERSONAL_DEBT",
      amount: 2500,
      isRecurring: false,
      frequency: "ONE_TIME",
      nextDueDate: monthDate(25),
      currentBalance: 2500,
      balanceSheetRole: "LIABILITY",
      status: "ACTIVE",
      categoryId: "rd_cat_debt",
      actorId: "rd_actor_person",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_insurance",
      name: "Home Insurance",
      flowKind: "EXPENSE",
      itemType: "INSURANCE",
      amount: 120,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(22),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "ACTIVE",
      categoryId: "rd_cat_insurance",
      actorId: "rd_actor_metro_bank",
      accountId: "rd_acct_checking",
    },
    {
      id: "rd_fi_paused_sub",
      name: "Paused Subscription",
      flowKind: "EXPENSE",
      itemType: "SUBSCRIPTION",
      amount: 15,
      isRecurring: true,
      frequency: "MONTHLY",
      nextDueDate: monthDate(28),
      currentBalance: 0,
      balanceSheetRole: "NONE",
      status: "PAUSED",
      categoryId: "rd_cat_other",
      actorId: "rd_actor_utility",
      accountId: "rd_acct_checking",
    },
  ];

  for (const item of financialItems) {
    await ensureRatesRecord(context, "financialItem", item.id, {
      name: item.name,
      flowKind: item.flowKind,
      itemType: item.itemType,
      amount: item.amount,
      currency: CURRENCY,
      isRecurring: item.isRecurring,
      frequency: item.frequency,
      nextDueDate: item.nextDueDate,
      currentBalance: item.currentBalance,
      balanceSheetRole: item.balanceSheetRole,
      status: item.status,
      categoryId: item.categoryId,
      actorId: item.actorId,
      accountId: item.accountId,
    });
  }

  await ensureRatesRecord(context, "loanDetails", "rd_loan_mortgage", {
    financialItemId: "rd_fi_mortgage",
    interestRateQuote: "EA",
    interestRate: 4.5,
    principalPortion: 1200,
    interestPortion: 650,
    rateType: "FIXED",
    amortizationType: "FRENCH",
    originalPrincipal: 300000,
  });

  await ensureRatesRecord(context, "loanDetails", "rd_loan_credit", {
    financialItemId: "rd_fi_credit_card",
    interestRateQuote: "NA",
    interestRate: 18.99,
    principalPortion: 200,
    interestPortion: 250,
    rateType: "VARIABLE",
    amortizationType: "NONE",
    creditLimit: 10000,
  });

  await ensureRatesRecord(context, "loanDetails", "rd_loan_personal", {
    financialItemId: "rd_fi_personal_loan",
    interestRateQuote: "EA",
    interestRate: 0,
    principalPortion: 2500,
    interestPortion: 0,
    rateType: "FIXED",
    amortizationType: "BULLET",
  });

  await ensureRatesRecord(context, "incomeDetails", "rd_income_salary", {
    financialItemId: "rd_fi_salary",
    amountBasis: "GROSS",
  });

  await ensureRatesRecord(context, "incomeDetails", "rd_income_rental_a", {
    financialItemId: "rd_fi_rental_a",
    leaseReference: "LEASE-A-2024",
  });

  await ensureRatesRecord(context, "incomeDetails", "rd_income_rental_b", {
    financialItemId: "rd_fi_rental_b",
    leaseReference: "LEASE-B-2024",
    annualEscalationRate: 3.5,
  });

  await ensureRatesRecord(context, "investmentDetails", "rd_inv_savings", {
    financialItemId: "rd_fi_yield_savings",
    expectedReturnRate: 4.0,
    riskLevel: "LOW",
    liquidity: "HIGH",
  });

  await ensureRatesRecord(context, "investmentDetails", "rd_inv_fiduciary", {
    financialItemId: "rd_fi_fiduciary",
    expectedReturnRate: 7.0,
    riskLevel: "MEDIUM",
    liquidity: "MEDIUM",
  });

  await ensureRatesRecord(context, "investmentDetails", "rd_inv_yield_income", {
    financialItemId: "rd_fi_yield_income",
    expectedReturnRate: 1.0,
    riskLevel: "LOW",
    liquidity: "HIGH",
  });

  await ensureRatesRecord(context, "serviceDetails", "rd_svc_electric", {
    financialItemId: "rd_fi_electric",
    autoPay: true,
    meterOrPolicyRef: "ACCT-1001",
  });

  await ensureRatesRecord(context, "serviceDetails", "rd_svc_hoa", {
    financialItemId: "rd_fi_hoa_a",
    autoPay: false,
    meterOrPolicyRef: "HOA-A",
  });

  const loanDetails = [
    { id: "rd_loan_mortgage", financialItemId: "rd_fi_mortgage" },
    { id: "rd_loan_credit", financialItemId: "rd_fi_credit_card" },
    { id: "rd_loan_personal", financialItemId: "rd_fi_personal_loan" },
  ] as const;

  const balanceSnapshots = [
    {
      id: "rd_snap_mortgage",
      financialItemId: "rd_fi_mortgage",
      date: priorMonthDate(1),
      balance: 252000,
      accruedInterest: 650,
    },
    {
      id: "rd_snap_credit",
      financialItemId: "rd_fi_credit_card",
      date: priorMonthDate(1),
      balance: 3400,
      accruedInterest: 45,
    },
    {
      id: "rd_snap_savings",
      financialItemId: "rd_fi_yield_savings",
      date: priorMonthDate(1),
      balance: 44500,
      accruedInterest: 150,
    },
    {
      id: "rd_snap_fiduciary",
      financialItemId: "rd_fi_fiduciary",
      date: priorMonthDate(1),
      balance: 74000,
      accruedInterest: 430,
    },
    {
      id: "rd_snap_mortgage_m2",
      financialItemId: "rd_fi_mortgage",
      date: priorMonthDate(2),
      balance: 253500,
      accruedInterest: 620,
    },
    {
      id: "rd_snap_credit_m2",
      financialItemId: "rd_fi_credit_card",
      date: priorMonthDate(2),
      balance: 3100,
      accruedInterest: 40,
    },
    {
      id: "rd_snap_savings_m2",
      financialItemId: "rd_fi_yield_savings",
      date: priorMonthDate(2),
      balance: 43800,
      accruedInterest: 145,
    },
    {
      id: "rd_snap_fiduciary_m2",
      financialItemId: "rd_fi_fiduciary",
      date: priorMonthDate(2),
      balance: 73500,
      accruedInterest: 410,
    },
    {
      id: "rd_snap_mortgage_m3",
      financialItemId: "rd_fi_mortgage",
      date: priorMonthDate(3),
      balance: 255000,
      accruedInterest: 600,
    },
    {
      id: "rd_snap_savings_m3",
      financialItemId: "rd_fi_yield_savings",
      date: priorMonthDate(3),
      balance: 43100,
      accruedInterest: 140,
    },
  ] as const;

  for (const snapshot of balanceSnapshots) {
    await ensureRatesRecord(context, "balanceSnapshot", snapshot.id, {
      financialItemId: snapshot.financialItemId,
      date: snapshot.date,
      balance: snapshot.balance,
      accruedInterest: snapshot.accruedInterest,
    });
  }

  const transactions = [
    {
      id: "rd_txn_salary_jul",
      type: "INCOME",
      amount: 6500,
      date: monthDate(1),
      description: "July salary deposit",
      accountId: "rd_acct_checking",
      financialItemId: "rd_fi_salary",
      categoryId: "rd_cat_income",
    },
    {
      id: "rd_txn_rental_a_jul",
      type: "INCOME",
      amount: 2200,
      date: monthDate(3),
      description: "Rental income A",
      accountId: "rd_acct_checking",
      financialItemId: "rd_fi_rental_a",
      categoryId: "rd_cat_income",
    },
    {
      id: "rd_txn_mortgage_jul",
      type: "PAYMENT",
      amount: 1850,
      date: monthDate(5),
      description: "Mortgage payment",
      accountId: "rd_acct_checking",
      financialItemId: "rd_fi_mortgage",
      categoryId: "rd_cat_debt",
    },
    {
      id: "rd_txn_electric_jul",
      type: "EXPENSE",
      amount: 140,
      date: monthDate(18),
      description: "Electric bill",
      accountId: "rd_acct_checking",
      financialItemId: "rd_fi_electric",
      categoryId: "rd_cat_utilities",
    },
    {
      id: "rd_txn_transfer_jul",
      type: "TRANSFER",
      amount: 500,
      date: monthDate(2),
      description: "Savings transfer",
      accountId: "rd_acct_savings",
      financialItemId: "rd_fi_savings_plan",
      categoryId: "rd_cat_transfers",
    },
    {
      id: "rd_txn_interest_jul",
      type: "INTEREST",
      amount: 375,
      date: monthDate(11),
      description: "Savings interest",
      accountId: "rd_acct_savings",
      financialItemId: "rd_fi_yield_income",
      categoryId: "rd_cat_income",
    },
    {
      id: "rd_txn_grocery_jul",
      type: "EXPENSE",
      amount: 285,
      date: monthDate(7),
      description: "Groceries",
      accountId: "rd_acct_checking",
      categoryId: "rd_cat_other",
    },
    {
      id: "rd_txn_salary_jun",
      type: "INCOME",
      amount: 6500,
      date: priorMonthDate(1),
      description: "June salary deposit",
      accountId: "rd_acct_checking",
      financialItemId: "rd_fi_salary",
      categoryId: "rd_cat_income",
    },
    {
      id: "rd_txn_rental_b_jun",
      type: "INCOME",
      amount: 1800,
      date: priorMonthDate(8),
      description: "Rental income B",
      accountId: "rd_acct_checking",
      financialItemId: "rd_fi_rental_b",
      categoryId: "rd_cat_income",
    },
    {
      id: "rd_txn_credit_jun",
      type: "PAYMENT",
      amount: 450,
      date: priorMonthDate(12),
      description: "Credit card payment",
      accountId: "rd_acct_checking",
      financialItemId: "rd_fi_credit_card",
      categoryId: "rd_cat_debt",
    },
  ] as const;

  for (const transaction of transactions) {
    await ensureRatesRecord(
      context,
      "transaction",
      transaction.id,
      transaction,
    );
  }

  return {
    loanDetails: [...loanDetails],
    financialItemIds: financialItems.map((item) => item.id),
  };
}
