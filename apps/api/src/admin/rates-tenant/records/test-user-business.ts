import type { RatesRecordSeedContext } from "../seed-helpers.js";
import { ensureRatesRecordInContext } from "../seed-helpers.js";

export async function seedTestUserBusinessRecords(
  context: RatesRecordSeedContext,
): Promise<void> {
  const ensure = (
    entityName: string,
    id: string,
    data: Record<string, unknown>,
  ) => ensureRatesRecordInContext(context, entityName, id, data);

  // --- Categories (12) ---
  const categories: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_cat_01",
      data: { name: "Living", categoryTypeId: "ctype_expense" },
    },
    {
      id: "tu1_cat_02",
      data: {
        name: "Food",
        categoryTypeId: "ctype_expense",
        parentId: "tu1_cat_01",
      },
    },
    {
      id: "tu1_cat_03",
      data: {
        name: "Utilities",
        categoryTypeId: "ctype_expense",
        parentId: "tu1_cat_01",
      },
    },
    {
      id: "tu1_cat_04",
      data: {
        name: "Shopping",
        categoryTypeId: "ctype_expense",
        parentId: "tu1_cat_01",
      },
    },
    {
      id: "tu1_cat_05",
      data: { name: "Transport", categoryTypeId: "ctype_expense" },
    },
    {
      id: "tu1_cat_06",
      data: { name: "Health", categoryTypeId: "ctype_expense" },
    },
    {
      id: "tu1_cat_07",
      data: { name: "Entertainment", categoryTypeId: "ctype_expense" },
    },
    {
      id: "tu1_cat_08",
      data: { name: "Education", categoryTypeId: "ctype_expense" },
    },
    {
      id: "tu1_cat_09",
      data: { name: "Insurance", categoryTypeId: "ctype_expense" },
    },
    {
      id: "tu1_cat_10",
      data: { name: "Income", categoryTypeId: "ctype_income" },
    },
    {
      id: "tu1_cat_11",
      data: {
        name: "Salary",
        categoryTypeId: "ctype_income",
        parentId: "tu1_cat_10",
      },
    },
    {
      id: "tu1_cat_12",
      data: {
        name: "Freelance",
        categoryTypeId: "ctype_income",
        parentId: "tu1_cat_10",
      },
    },
  ];
  for (const row of categories) {
    await ensure("category", row.id, row.data);
  }

  // --- Accounts (12) ---
  const accounts: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_acc_01",
      data: {
        name: "Bancolombia Ahorros",
        accountTypeId: "atype_bank",
        currencyId: "currency_cop",
        balance: 4_250_000,
      },
    },
    {
      id: "tu1_acc_02",
      data: {
        name: "Davivienda Cuenta Corriente",
        accountTypeId: "atype_bank",
        currencyId: "currency_cop",
        balance: 1_890_000,
      },
    },
    {
      id: "tu1_acc_03",
      data: {
        name: "Nequi",
        accountTypeId: "atype_wallet",
        currencyId: "currency_cop",
        balance: 620_000,
      },
    },
    {
      id: "tu1_acc_04",
      data: {
        name: "Daviplata",
        accountTypeId: "atype_wallet",
        currencyId: "currency_cop",
        balance: 310_000,
      },
    },
    {
      id: "tu1_acc_05",
      data: {
        name: "Bancolombia Visa",
        accountTypeId: "atype_credit",
        currencyId: "currency_cop",
        balance: -1_850_000,
      },
    },
    {
      id: "tu1_acc_06",
      data: {
        name: "RappiCard",
        accountTypeId: "atype_credit",
        currencyId: "currency_cop",
        balance: -420_000,
      },
    },
    {
      id: "tu1_acc_07",
      data: {
        name: "BBVA Colombia",
        accountTypeId: "atype_bank",
        currencyId: "currency_cop",
        balance: 980_000,
      },
    },
    {
      id: "tu1_acc_08",
      data: {
        name: "Lulo Bank",
        accountTypeId: "atype_wallet",
        currencyId: "currency_cop",
        balance: 155_000,
      },
    },
    {
      id: "tu1_acc_09",
      data: {
        name: "Scotiabank Colpatria",
        accountTypeId: "atype_bank",
        currencyId: "currency_cop",
        balance: 2_100_000,
      },
    },
    {
      id: "tu1_acc_10",
      data: {
        name: "USD Reserve",
        accountTypeId: "atype_bank",
        currencyId: "currency_usd",
        balance: 3_200,
      },
    },
    {
      id: "tu1_acc_11",
      data: {
        name: "Banco de Bogotá",
        accountTypeId: "atype_bank",
        currencyId: "currency_cop",
        balance: 540_000,
      },
    },
    {
      id: "tu1_acc_12",
      data: {
        name: "Mastercard Gold",
        accountTypeId: "atype_credit",
        currencyId: "currency_cop",
        balance: -890_000,
      },
    },
  ];
  for (const row of accounts) {
    await ensure("account", row.id, row.data);
  }

  // --- Financial products (12) ---
  const products: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_prod_01",
      data: {
        name: "Mazda CX-5 Loan",
        productTypeId: "ptype_loan",
        categoryId: "tu1_cat_05",
        currencyId: "currency_cop",
        initialAmount: 32_000_000,
        currentBalance: 19_400_000,
        startDate: "2024-02-01T00:00:00.000Z",
        endDate: "2029-02-01T00:00:00.000Z",
        statusId: "status_active",
        description: "Vehicle financing",
      },
    },
    {
      id: "tu1_prod_02",
      data: {
        name: "Apartment Mortgage",
        productTypeId: "ptype_loan",
        categoryId: "tu1_cat_01",
        currencyId: "currency_cop",
        initialAmount: 195_000_000,
        currentBalance: 171_500_000,
        startDate: "2021-08-01T00:00:00.000Z",
        endDate: "2046-08-01T00:00:00.000Z",
        statusId: "status_active",
        description: "Fixed-rate mortgage Chapinero",
      },
    },
    {
      id: "tu1_prod_03",
      data: {
        name: "Employer Salary",
        productTypeId: "ptype_income",
        categoryId: "tu1_cat_11",
        currencyId: "currency_cop",
        initialAmount: 8_500_000,
        currentBalance: 8_500_000,
        startDate: "2022-03-01T00:00:00.000Z",
        statusId: "status_active",
        description: "Full-time employment income",
      },
    },
    {
      id: "tu1_prod_04",
      data: {
        name: "UX Consulting",
        productTypeId: "ptype_income",
        categoryId: "tu1_cat_12",
        currencyId: "currency_cop",
        initialAmount: 2_400_000,
        currentBalance: 2_400_000,
        startDate: "2024-06-01T00:00:00.000Z",
        statusId: "status_active",
        description: "Monthly freelance retainer",
      },
    },
    {
      id: "tu1_prod_05",
      data: {
        name: "Netflix",
        productTypeId: "ptype_subscription",
        categoryId: "tu1_cat_07",
        currencyId: "currency_cop",
        initialAmount: 44_900,
        currentBalance: 44_900,
        startDate: "2023-01-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
    {
      id: "tu1_prod_06",
      data: {
        name: "Spotify",
        productTypeId: "ptype_subscription",
        categoryId: "tu1_cat_07",
        currencyId: "currency_cop",
        initialAmount: 21_900,
        currentBalance: 21_900,
        startDate: "2023-04-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
    {
      id: "tu1_prod_07",
      data: {
        name: "Disney+",
        productTypeId: "ptype_subscription",
        categoryId: "tu1_cat_07",
        currencyId: "currency_cop",
        initialAmount: 33_900,
        currentBalance: 33_900,
        startDate: "2024-01-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
    {
      id: "tu1_prod_08",
      data: {
        name: "CDT 12 months",
        productTypeId: "ptype_investment",
        categoryId: "tu1_cat_10",
        currencyId: "currency_cop",
        initialAmount: 18_000_000,
        currentBalance: 18_950_000,
        startDate: "2024-10-01T00:00:00.000Z",
        endDate: "2025-10-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
    {
      id: "tu1_prod_09",
      data: {
        name: "Fiduciaria Porvenir",
        productTypeId: "ptype_investment",
        categoryId: "tu1_cat_10",
        currencyId: "currency_cop",
        initialAmount: 12_000_000,
        currentBalance: 12_480_000,
        startDate: "2024-04-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
    {
      id: "tu1_prod_10",
      data: {
        name: "Visa Revolving",
        productTypeId: "ptype_credit_card",
        categoryId: "tu1_cat_04",
        currencyId: "currency_cop",
        initialAmount: 4_500_000,
        currentBalance: 2_100_000,
        startDate: "2023-06-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
    {
      id: "tu1_prod_11",
      data: {
        name: "Personal Loan",
        productTypeId: "ptype_loan",
        categoryId: "tu1_cat_08",
        currencyId: "currency_cop",
        initialAmount: 8_000_000,
        currentBalance: 5_200_000,
        startDate: "2024-11-01T00:00:00.000Z",
        endDate: "2027-11-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
    {
      id: "tu1_prod_12",
      data: {
        name: "E-bike Loan",
        productTypeId: "ptype_loan",
        categoryId: "tu1_cat_05",
        currencyId: "currency_cop",
        initialAmount: 4_500_000,
        currentBalance: 3_100_000,
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2027-01-01T00:00:00.000Z",
        statusId: "status_active",
      },
    },
  ];
  for (const row of products) {
    await ensure("financialProduct", row.id, row.data);
  }

  // --- Product terms (12) ---
  const terms: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_term_01",
      data: {
        productId: "tu1_prod_01",
        interestRate: 0.132,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 1_250_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 60,
        amortizationTypeId: "amort_french",
        gracePeriods: 0,
      },
    },
    {
      id: "tu1_term_02",
      data: {
        productId: "tu1_prod_02",
        interestRate: 0.095,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 1_720_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 300,
        amortizationTypeId: "amort_french",
      },
    },
    {
      id: "tu1_term_03",
      data: {
        productId: "tu1_prod_11",
        interestRate: 0.18,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 320_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 36,
        amortizationTypeId: "amort_french",
      },
    },
    {
      id: "tu1_term_04",
      data: {
        productId: "tu1_prod_12",
        interestRate: 0.15,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 210_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 24,
        amortizationTypeId: "amort_french",
      },
    },
    {
      id: "tu1_term_05",
      data: {
        productId: "tu1_prod_01",
        interestRate: 0.128,
        rateTypeId: "rate_variable",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 1_240_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 60,
        amortizationTypeId: "amort_german",
      },
    },
    {
      id: "tu1_term_06",
      data: {
        productId: "tu1_prod_02",
        interestRate: 0.092,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_daily",
        paymentAmount: 1_715_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 300,
        amortizationTypeId: "amort_french",
      },
    },
    {
      id: "tu1_term_07",
      data: {
        productId: "tu1_prod_11",
        interestRate: 0.175,
        rateTypeId: "rate_variable",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 315_000,
        paymentFrequencyId: "freq_biweekly",
        totalPeriods: 72,
        amortizationTypeId: "amort_french",
      },
    },
    {
      id: "tu1_term_08",
      data: {
        productId: "tu1_prod_12",
        interestRate: 0.148,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 205_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 24,
        amortizationTypeId: "amort_german",
      },
    },
    {
      id: "tu1_term_09",
      data: {
        productId: "tu1_prod_01",
        interestRate: 0.135,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 1_255_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 58,
        amortizationTypeId: "amort_french",
        gracePeriods: 2,
      },
    },
    {
      id: "tu1_term_10",
      data: {
        productId: "tu1_prod_02",
        interestRate: 0.097,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 1_725_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 298,
        amortizationTypeId: "amort_french",
      },
    },
    {
      id: "tu1_term_11",
      data: {
        productId: "tu1_prod_11",
        interestRate: 0.182,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 325_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 34,
        amortizationTypeId: "amort_french",
      },
    },
    {
      id: "tu1_term_12",
      data: {
        productId: "tu1_prod_12",
        interestRate: 0.152,
        rateTypeId: "rate_fixed",
        compoundingFrequencyId: "comp_monthly",
        paymentAmount: 208_000,
        paymentFrequencyId: "freq_monthly",
        totalPeriods: 22,
        amortizationTypeId: "amort_french",
      },
    },
  ];
  for (const row of terms) {
    await ensure("productTerm", row.id, row.data);
  }

  // --- Income details (12) — income products + extras on salary lines ---
  const incomeDetails: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_incdet_01",
      data: {
        productId: "tu1_prod_03",
        incomeTypeId: "inc_salary",
        expectedAmount: 8_500_000,
        variabilityTypeId: "var_fixed",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_02",
      data: {
        productId: "tu1_prod_04",
        incomeTypeId: "inc_freelance",
        expectedAmount: 2_400_000,
        variabilityTypeId: "var_variable",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_03",
      data: {
        productId: "tu1_prod_03",
        incomeTypeId: "inc_salary",
        expectedAmount: 8_200_000,
        variabilityTypeId: "var_fixed",
        frequencyId: "freq_biweekly",
      },
    },
    {
      id: "tu1_incdet_04",
      data: {
        productId: "tu1_prod_04",
        incomeTypeId: "inc_freelance",
        expectedAmount: 2_800_000,
        variabilityTypeId: "var_variable",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_05",
      data: {
        productId: "tu1_prod_03",
        incomeTypeId: "inc_salary",
        expectedAmount: 8_750_000,
        variabilityTypeId: "var_fixed",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_06",
      data: {
        productId: "tu1_prod_04",
        incomeTypeId: "inc_freelance",
        expectedAmount: 1_900_000,
        variabilityTypeId: "var_fixed",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_07",
      data: {
        productId: "tu1_prod_03",
        incomeTypeId: "inc_salary",
        expectedAmount: 8_400_000,
        variabilityTypeId: "var_fixed",
        frequencyId: "freq_annual",
      },
    },
    {
      id: "tu1_incdet_08",
      data: {
        productId: "tu1_prod_04",
        incomeTypeId: "inc_freelance",
        expectedAmount: 3_100_000,
        variabilityTypeId: "var_variable",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_09",
      data: {
        productId: "tu1_prod_03",
        incomeTypeId: "inc_salary",
        expectedAmount: 8_600_000,
        variabilityTypeId: "var_fixed",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_10",
      data: {
        productId: "tu1_prod_04",
        incomeTypeId: "inc_freelance",
        expectedAmount: 2_200_000,
        variabilityTypeId: "var_variable",
        frequencyId: "freq_biweekly",
      },
    },
    {
      id: "tu1_incdet_11",
      data: {
        productId: "tu1_prod_03",
        incomeTypeId: "inc_salary",
        expectedAmount: 8_550_000,
        variabilityTypeId: "var_fixed",
        frequencyId: "freq_monthly",
      },
    },
    {
      id: "tu1_incdet_12",
      data: {
        productId: "tu1_prod_04",
        incomeTypeId: "inc_freelance",
        expectedAmount: 2_650_000,
        variabilityTypeId: "var_variable",
        frequencyId: "freq_monthly",
      },
    },
  ];
  for (const row of incomeDetails) {
    await ensure("incomeDetail", row.id, row.data);
  }

  // --- Subscription details (12) ---
  const subscriptions: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_subdet_01",
      data: {
        productId: "tu1_prod_05",
        provider: "Netflix",
        planName: "Standard",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-06-05T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_02",
      data: {
        productId: "tu1_prod_06",
        provider: "Spotify",
        planName: "Premium",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-06-12T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_03",
      data: {
        productId: "tu1_prod_07",
        provider: "Disney+",
        planName: "Standard",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-06-18T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_04",
      data: {
        productId: "tu1_prod_05",
        provider: "Netflix",
        planName: "Premium",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-07-05T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_05",
      data: {
        productId: "tu1_prod_06",
        provider: "Spotify",
        planName: "Duo",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-07-12T00:00:00.000Z",
        autoRenew: false,
      },
    },
    {
      id: "tu1_subdet_06",
      data: {
        productId: "tu1_prod_07",
        provider: "Disney+",
        planName: "Bundle",
        billingFrequencyId: "freq_annual",
        nextBillingDate: "2026-01-18T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_07",
      data: {
        productId: "tu1_prod_05",
        provider: "Netflix",
        planName: "Basic",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-08-05T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_08",
      data: {
        productId: "tu1_prod_06",
        provider: "Spotify",
        planName: "Family",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-08-12T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_09",
      data: {
        productId: "tu1_prod_07",
        provider: "Disney+",
        planName: "Premium",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-08-18T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_10",
      data: {
        productId: "tu1_prod_05",
        provider: "Netflix",
        planName: "Standard with ads",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-09-05T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_11",
      data: {
        productId: "tu1_prod_06",
        provider: "Spotify",
        planName: "Student",
        billingFrequencyId: "freq_monthly",
        nextBillingDate: "2025-09-12T00:00:00.000Z",
        autoRenew: true,
      },
    },
    {
      id: "tu1_subdet_12",
      data: {
        productId: "tu1_prod_07",
        provider: "Disney+",
        planName: "Annual",
        billingFrequencyId: "freq_annual",
        nextBillingDate: "2026-06-18T00:00:00.000Z",
        autoRenew: true,
      },
    },
  ];
  for (const row of subscriptions) {
    await ensure("subscriptionDetail", row.id, row.data);
  }

  // --- Investment details (12) ---
  const investments: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_invdet_01",
      data: {
        productId: "tu1_prod_08",
        expectedReturnRate: 0.11,
        riskLevelId: "risk_level_low",
        liquidity: "LOW",
      },
    },
    {
      id: "tu1_invdet_02",
      data: {
        productId: "tu1_prod_09",
        expectedReturnRate: 0.095,
        riskLevelId: "risk_level_medium",
        liquidity: "MEDIUM",
      },
    },
    {
      id: "tu1_invdet_03",
      data: {
        productId: "tu1_prod_08",
        expectedReturnRate: 0.105,
        riskLevelId: "risk_level_low",
        liquidity: "LOW",
      },
    },
    {
      id: "tu1_invdet_04",
      data: {
        productId: "tu1_prod_09",
        expectedReturnRate: 0.088,
        riskLevelId: "risk_level_low",
        liquidity: "HIGH",
      },
    },
    {
      id: "tu1_invdet_05",
      data: {
        productId: "tu1_prod_08",
        expectedReturnRate: 0.112,
        riskLevelId: "risk_level_low",
        liquidity: "LOW",
      },
    },
    {
      id: "tu1_invdet_06",
      data: {
        productId: "tu1_prod_09",
        expectedReturnRate: 0.102,
        riskLevelId: "risk_level_medium",
        liquidity: "MEDIUM",
      },
    },
    {
      id: "tu1_invdet_07",
      data: {
        productId: "tu1_prod_08",
        expectedReturnRate: 0.108,
        riskLevelId: "risk_level_low",
        liquidity: "MEDIUM",
      },
    },
    {
      id: "tu1_invdet_08",
      data: {
        productId: "tu1_prod_09",
        expectedReturnRate: 0.12,
        riskLevelId: "risk_level_high",
        liquidity: "LOW",
      },
    },
    {
      id: "tu1_invdet_09",
      data: {
        productId: "tu1_prod_08",
        expectedReturnRate: 0.115,
        riskLevelId: "risk_level_low",
        liquidity: "LOW",
      },
    },
    {
      id: "tu1_invdet_10",
      data: {
        productId: "tu1_prod_09",
        expectedReturnRate: 0.092,
        riskLevelId: "risk_level_medium",
        liquidity: "MEDIUM",
      },
    },
    {
      id: "tu1_invdet_11",
      data: {
        productId: "tu1_prod_08",
        expectedReturnRate: 0.118,
        riskLevelId: "risk_level_low",
        liquidity: "LOW",
      },
    },
    {
      id: "tu1_invdet_12",
      data: {
        productId: "tu1_prod_09",
        expectedReturnRate: 0.099,
        riskLevelId: "risk_level_low",
        liquidity: "HIGH",
      },
    },
  ];
  for (const row of investments) {
    await ensure("investmentDetail", row.id, row.data);
  }

  // --- Product snapshots (12) ---
  const snapshots: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_snap_01",
      data: {
        productId: "tu1_prod_01",
        date: "2025-01-01T00:00:00.000Z",
        balance: 21_000_000,
        accruedInterest: 180_000,
      },
    },
    {
      id: "tu1_snap_02",
      data: {
        productId: "tu1_prod_01",
        date: "2025-02-01T00:00:00.000Z",
        balance: 20_400_000,
        accruedInterest: 195_000,
      },
    },
    {
      id: "tu1_snap_03",
      data: {
        productId: "tu1_prod_01",
        date: "2025-03-01T00:00:00.000Z",
        balance: 19_900_000,
        accruedInterest: 210_000,
      },
    },
    {
      id: "tu1_snap_04",
      data: {
        productId: "tu1_prod_02",
        date: "2025-03-01T00:00:00.000Z",
        balance: 173_000_000,
        accruedInterest: 1_050_000,
      },
    },
    {
      id: "tu1_snap_05",
      data: {
        productId: "tu1_prod_02",
        date: "2025-04-01T00:00:00.000Z",
        balance: 172_200_000,
        accruedInterest: 1_080_000,
      },
    },
    {
      id: "tu1_snap_06",
      data: {
        productId: "tu1_prod_08",
        date: "2025-04-01T00:00:00.000Z",
        balance: 18_400_000,
        accruedInterest: 420_000,
      },
    },
    {
      id: "tu1_snap_07",
      data: {
        productId: "tu1_prod_01",
        date: "2025-04-01T00:00:00.000Z",
        balance: 19_400_000,
        accruedInterest: 225_000,
      },
    },
    {
      id: "tu1_snap_08",
      data: {
        productId: "tu1_prod_02",
        date: "2025-05-01T00:00:00.000Z",
        balance: 171_500_000,
        accruedInterest: 1_100_000,
      },
    },
    {
      id: "tu1_snap_09",
      data: {
        productId: "tu1_prod_11",
        date: "2025-05-01T00:00:00.000Z",
        balance: 5_200_000,
        accruedInterest: 85_000,
      },
    },
    {
      id: "tu1_snap_10",
      data: {
        productId: "tu1_prod_12",
        date: "2025-05-01T00:00:00.000Z",
        balance: 3_100_000,
        accruedInterest: 42_000,
      },
    },
    {
      id: "tu1_snap_11",
      data: {
        productId: "tu1_prod_08",
        date: "2025-05-01T00:00:00.000Z",
        balance: 18_950_000,
        accruedInterest: 480_000,
      },
    },
    {
      id: "tu1_snap_12",
      data: {
        productId: "tu1_prod_09",
        date: "2025-05-01T00:00:00.000Z",
        balance: 12_480_000,
        accruedInterest: 310_000,
      },
    },
  ];
  for (const row of snapshots) {
    await ensure("productSnapshot", row.id, row.data);
  }

  // --- Transactions (12) ---
  const transactions: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_txn_01",
      data: {
        productId: "tu1_prod_03",
        accountId: "tu1_acc_01",
        transactionTypeId: "txn_income",
        amount: 8_500_000,
        date: "2025-05-01T08:00:00.000Z",
        categoryId: "tu1_cat_11",
        description: "May salary deposit",
      },
    },
    {
      id: "tu1_txn_02",
      data: {
        productId: "tu1_prod_01",
        accountId: "tu1_acc_01",
        transactionTypeId: "txn_payment",
        amount: 1_250_000,
        date: "2025-05-03T10:30:00.000Z",
        categoryId: "tu1_cat_05",
        description: "Car loan May",
      },
    },
    {
      id: "tu1_txn_03",
      data: {
        productId: "tu1_prod_02",
        accountId: "tu1_acc_01",
        transactionTypeId: "txn_payment",
        amount: 1_720_000,
        date: "2025-05-05T09:00:00.000Z",
        categoryId: "tu1_cat_01",
        description: "Mortgage May",
      },
    },
    {
      id: "tu1_txn_04",
      data: {
        accountId: "tu1_acc_03",
        transactionTypeId: "txn_expense",
        amount: 312_000,
        date: "2025-05-07T18:00:00.000Z",
        categoryId: "tu1_cat_02",
        description: "Éxito groceries",
      },
    },
    {
      id: "tu1_txn_05",
      data: {
        productId: "tu1_prod_05",
        accountId: "tu1_acc_05",
        transactionTypeId: "txn_expense",
        amount: 44_900,
        date: "2025-05-05T00:00:00.000Z",
        categoryId: "tu1_cat_07",
        description: "Netflix",
      },
    },
    {
      id: "tu1_txn_06",
      data: {
        productId: "tu1_prod_04",
        accountId: "tu1_acc_02",
        transactionTypeId: "txn_income",
        amount: 2_400_000,
        date: "2025-05-10T11:00:00.000Z",
        categoryId: "tu1_cat_12",
        description: "Freelance invoice paid",
      },
    },
    {
      id: "tu1_txn_07",
      data: {
        accountId: "tu1_acc_03",
        transactionTypeId: "txn_expense",
        amount: 125_000,
        date: "2025-05-11T07:30:00.000Z",
        categoryId: "tu1_cat_05",
        description: "Terpel fuel",
      },
    },
    {
      id: "tu1_txn_08",
      data: {
        accountId: "tu1_acc_01",
        transactionTypeId: "txn_expense",
        amount: 215_000,
        date: "2025-05-12T14:00:00.000Z",
        categoryId: "tu1_cat_03",
        description: "EPM electricity",
      },
    },
    {
      id: "tu1_txn_09",
      data: {
        productId: "tu1_prod_11",
        accountId: "tu1_acc_01",
        transactionTypeId: "txn_payment",
        amount: 320_000,
        date: "2025-05-14T09:00:00.000Z",
        categoryId: "tu1_cat_08",
        description: "Personal loan May",
      },
    },
    {
      id: "tu1_txn_10",
      data: {
        productId: "tu1_prod_03",
        accountId: "tu1_acc_01",
        transactionTypeId: "txn_income",
        amount: 8_500_000,
        date: "2025-04-01T08:00:00.000Z",
        categoryId: "tu1_cat_11",
        description: "April salary",
      },
    },
    {
      id: "tu1_txn_11",
      data: {
        accountId: "tu1_acc_07",
        transactionTypeId: "txn_transfer",
        amount: 500_000,
        date: "2025-05-15T16:00:00.000Z",
        categoryId: "tu1_cat_01",
        description: "Transfer to savings goal",
      },
    },
    {
      id: "tu1_txn_12",
      data: {
        productId: "tu1_prod_06",
        accountId: "tu1_acc_06",
        transactionTypeId: "txn_expense",
        amount: 21_900,
        date: "2025-05-12T00:00:00.000Z",
        categoryId: "tu1_cat_07",
        description: "Spotify Premium",
      },
    },
  ];
  for (const row of transactions) {
    await ensure("transaction", row.id, row.data);
  }

  // --- Transaction sources (12) ---
  const sources: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_tsrc_01",
      data: {
        transactionId: "tu1_txn_02",
        sourceProductId: "tu1_prod_03",
        percentage: 1,
      },
    },
    {
      id: "tu1_tsrc_02",
      data: {
        transactionId: "tu1_txn_03",
        sourceProductId: "tu1_prod_03",
        percentage: 0.6,
      },
    },
    {
      id: "tu1_tsrc_03",
      data: {
        transactionId: "tu1_txn_03",
        sourceProductId: "tu1_prod_04",
        percentage: 0.4,
      },
    },
    {
      id: "tu1_tsrc_04",
      data: {
        transactionId: "tu1_txn_09",
        sourceProductId: "tu1_prod_04",
        percentage: 1,
      },
    },
    {
      id: "tu1_tsrc_05",
      data: {
        transactionId: "tu1_txn_02",
        sourceProductId: "tu1_prod_04",
        percentage: 0.15,
      },
    },
    {
      id: "tu1_tsrc_06",
      data: {
        transactionId: "tu1_txn_01",
        sourceProductId: "tu1_prod_03",
        percentage: 1,
      },
    },
    {
      id: "tu1_tsrc_07",
      data: {
        transactionId: "tu1_txn_10",
        sourceProductId: "tu1_prod_03",
        percentage: 1,
      },
    },
    {
      id: "tu1_tsrc_08",
      data: {
        transactionId: "tu1_txn_03",
        sourceProductId: "tu1_prod_03",
        percentage: 0.5,
      },
    },
    {
      id: "tu1_tsrc_09",
      data: {
        transactionId: "tu1_txn_09",
        sourceProductId: "tu1_prod_03",
        percentage: 0.7,
      },
    },
    {
      id: "tu1_tsrc_10",
      data: {
        transactionId: "tu1_txn_02",
        sourceProductId: "tu1_prod_03",
        percentage: 0.85,
      },
    },
    {
      id: "tu1_tsrc_11",
      data: {
        transactionId: "tu1_txn_11",
        sourceProductId: "tu1_prod_03",
        percentage: 1,
      },
    },
    {
      id: "tu1_tsrc_12",
      data: {
        transactionId: "tu1_txn_06",
        sourceProductId: "tu1_prod_04",
        percentage: 1,
      },
    },
  ];
  for (const row of sources) {
    await ensure("transactionSource", row.id, row.data);
  }

  // --- Cashflows (12) ---
  const cashflows: ReadonlyArray<{
    readonly id: string;
    readonly data: Record<string, unknown>;
  }> = [
    {
      id: "tu1_cf_01",
      data: {
        transactionId: "tu1_txn_01",
        directionId: "dir_in",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
    {
      id: "tu1_cf_02",
      data: {
        transactionId: "tu1_txn_02",
        directionId: "dir_out",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
    {
      id: "tu1_cf_03",
      data: {
        transactionId: "tu1_txn_03",
        directionId: "dir_out",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
    {
      id: "tu1_cf_04",
      data: {
        transactionId: "tu1_txn_04",
        directionId: "dir_out",
        recurring: false,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_variable",
      },
    },
    {
      id: "tu1_cf_05",
      data: {
        transactionId: "tu1_txn_05",
        directionId: "dir_out",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
    {
      id: "tu1_cf_06",
      data: {
        transactionId: "tu1_txn_06",
        directionId: "dir_in",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_variable",
      },
    },
    {
      id: "tu1_cf_07",
      data: {
        transactionId: "tu1_txn_07",
        directionId: "dir_out",
        recurring: false,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_variable",
      },
    },
    {
      id: "tu1_cf_08",
      data: {
        transactionId: "tu1_txn_08",
        directionId: "dir_out",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
    {
      id: "tu1_cf_09",
      data: {
        transactionId: "tu1_txn_09",
        directionId: "dir_out",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
    {
      id: "tu1_cf_10",
      data: {
        transactionId: "tu1_txn_10",
        directionId: "dir_in",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
    {
      id: "tu1_cf_11",
      data: {
        transactionId: "tu1_txn_11",
        directionId: "dir_out",
        recurring: false,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_variable",
      },
    },
    {
      id: "tu1_cf_12",
      data: {
        transactionId: "tu1_txn_12",
        directionId: "dir_out",
        recurring: true,
        frequencyId: "freq_monthly",
        variabilityTypeId: "var_fixed",
      },
    },
  ];
  for (const row of cashflows) {
    await ensure("cashflow", row.id, row.data);
  }
}
