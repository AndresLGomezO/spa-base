import {
  RATES_SNAPSHOTS_PER_CONTRACT,
  RATES_STATEMENTS_PER_LOAN_CONTRACT,
} from "../constants.js";
import { uploadRatesEmptyPdf } from "../seed-rates-documents.js";
import {
  ensureRatesRecord,
  type RatesRecordSeedContext,
} from "../seed-record-helpers.js";

const CATEGORY_TYPES = [
  "EXPENSE",
  "EXPENSE",
  "EXPENSE",
  "EXPENSE",
  "EXPENSE",
  "EXPENSE",
  "EXPENSE",
  "INCOME",
  "INCOME",
  "SAVINGS",
] as const;

const CATEGORY_NAMES = [
  "Living",
  "Food",
  "Transport",
  "Health",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Salary",
  "Freelance",
  "Emergency Fund",
] as const;

const PROVIDER_TYPES = [
  "BANK",
  "BANK",
  "SERVICE",
  "SERVICE",
  "EMPLOYER",
  "BROKER",
  "UTILITY",
  "INSURANCE",
  "TAX_AUTHORITY",
  "OTHER",
] as const;

const PROVIDER_NAMES = [
  "Bancolombia",
  "Davivienda",
  "Netflix",
  "Spotify",
  "Acme Corp",
  "Fidelity",
  "EPM Utilities",
  "Sura Insurance",
  "DIAN",
  "Misc Provider",
] as const;

const ACCOUNT_TYPES = [
  "BANK",
  "BANK",
  "DIGITAL_WALLET",
  "DIGITAL_WALLET",
  "BANK",
  "BROKER",
  "BANK",
  "CASH",
  "CRYPTO_WALLET",
  "BANK",
] as const;

const TRANSACTION_TYPES = [
  "EXPENSE",
  "EXPENSE",
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "PAYMENT",
  "INVESTMENT_BUY",
  "FEE",
  "TAX",
  "INTEREST",
] as const;

const SUBSCRIPTION_PLANS = [
  "Standard",
  "Premium",
  "Family",
  "Basic",
  "Pro",
  "Annual",
  "Monthly",
  "Student",
  "Business",
  "Enterprise",
] as const;

const LOAN_CONTRACT_IDS = ["rd_con_14", "rd_con_15"] as const;

type ContractStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "CLOSED"
  | "DEFAULTED"
  | "PAUSED"
  | "COMPLETED";

type ContractFrequency =
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY"
  | "SEMIANNUAL"
  | "ANNUAL"
  | "IRREGULAR";

interface ContractDemoSeed {
  readonly name: string;
  readonly contractType:
    | "SUBSCRIPTION"
    | "INCOME_SOURCE"
    | "MORTGAGE"
    | "CREDIT_CARD";
  readonly categoryIndex: number;
  readonly providerIndex: number;
  readonly currency: "COP" | "USD";
  readonly initialAmount: number;
  readonly currentBalance: number;
  readonly startDate: string;
  readonly endDate?: string;
  readonly status: ContractStatus;
  readonly description: string;
  readonly isRecurring: boolean;
  readonly frequency?: ContractFrequency;
  readonly frequencyInDays?: number;
  readonly variability?: "FIXED" | "VARIABLE";
  readonly tags?: readonly string[];
}

function padId(prefix: string, index: number): string {
  return `${prefix}_${String(index).padStart(2, "0")}`;
}

function dateOnly(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthStart(year: number, month: number): string {
  return dateOnly(year, month, 1);
}

const CONTRACT_DEMO_SEEDS: readonly ContractDemoSeed[] = [
  {
    name: "Netflix Standard",
    contractType: "SUBSCRIPTION",
    categoryIndex: 5,
    providerIndex: 3,
    currency: "COP",
    initialAmount: 32_900,
    currentBalance: 32_900,
    startDate: dateOnly(2023, 3, 15),
    status: "ACTIVE",
    description: "Standard streaming plan, 2 screens, HD.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["streaming", "entertainment", "household"],
  },
  {
    name: "Spotify Premium",
    contractType: "SUBSCRIPTION",
    categoryIndex: 5,
    providerIndex: 4,
    currency: "COP",
    initialAmount: 21_900,
    currentBalance: 21_900,
    startDate: dateOnly(2022, 11, 1),
    status: "ACTIVE",
    description: "Individual premium plan, ad-free music.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["streaming", "music", "mobile"],
  },
  {
    name: "Bancolombia Cuenta de Ahorros",
    contractType: "SUBSCRIPTION",
    categoryIndex: 10,
    providerIndex: 1,
    currency: "COP",
    initialAmount: 18_500,
    currentBalance: 18_500,
    startDate: dateOnly(2021, 6, 1),
    status: "ACTIVE",
    description: "Monthly account maintenance fee.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["banking", "fees", "savings"],
  },
  {
    name: "Davivienda Plan Empresarial",
    contractType: "SUBSCRIPTION",
    categoryIndex: 6,
    providerIndex: 2,
    currency: "COP",
    initialAmount: 45_000,
    currentBalance: 45_000,
    startDate: dateOnly(2024, 1, 10),
    status: "ACTIVE",
    description: "Business banking package with payroll module.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["banking", "business", "payroll"],
  },
  {
    name: "Acme Corp Enterprise SaaS",
    contractType: "SUBSCRIPTION",
    categoryIndex: 6,
    providerIndex: 5,
    currency: "USD",
    initialAmount: 1_200,
    currentBalance: 1_200,
    startDate: dateOnly(2024, 4, 1),
    endDate: dateOnly(2027, 3, 31),
    status: "ACTIVE",
    description: "Annual enterprise license for project management suite.",
    isRecurring: true,
    frequency: "ANNUAL",
    frequencyInDays: 365,
    variability: "FIXED",
    tags: ["saas", "productivity", "business", "annual-billing"],
  },
  {
    name: "Fidelity Active Trader Pro",
    contractType: "SUBSCRIPTION",
    categoryIndex: 10,
    providerIndex: 6,
    currency: "USD",
    initialAmount: 49.95,
    currentBalance: 49.95,
    startDate: dateOnly(2023, 8, 20),
    status: "ACTIVE",
    description: "Brokerage platform subscription with real-time quotes.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["investing", "brokerage", "trading"],
  },
  {
    name: "EPM Utilities — Residencial",
    contractType: "SUBSCRIPTION",
    categoryIndex: 6,
    providerIndex: 7,
    currency: "COP",
    initialAmount: 185_000,
    currentBalance: 212_400,
    startDate: dateOnly(2020, 1, 1),
    status: "ACTIVE",
    description:
      "Electricity and water utility service, variable monthly bill.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "VARIABLE",
    tags: ["utilities", "essential", "household", "variable-cost"],
  },
  {
    name: "Sura Seguro de Salud",
    contractType: "SUBSCRIPTION",
    categoryIndex: 4,
    providerIndex: 8,
    currency: "COP",
    initialAmount: 890_000,
    currentBalance: 890_000,
    startDate: dateOnly(2023, 1, 1),
    endDate: dateOnly(2026, 12, 31),
    status: "ACTIVE",
    description: "Family health insurance policy, copay plan.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["insurance", "health", "family", "protection"],
  },
  {
    name: "DIAN Declaración Renta",
    contractType: "SUBSCRIPTION",
    categoryIndex: 6,
    providerIndex: 9,
    currency: "COP",
    initialAmount: 0,
    currentBalance: 0,
    startDate: dateOnly(2025, 1, 1),
    endDate: dateOnly(2025, 4, 30),
    status: "PAUSED",
    description: "Annual income tax filing obligation — filing window closed.",
    isRecurring: true,
    frequency: "ANNUAL",
    frequencyInDays: 365,
    variability: "VARIABLE",
    tags: ["tax", "government", "compliance", "annual"],
  },
  {
    name: "Misc Cloud Backup",
    contractType: "SUBSCRIPTION",
    categoryIndex: 7,
    providerIndex: 10,
    currency: "USD",
    initialAmount: 9.99,
    currentBalance: 9.99,
    startDate: dateOnly(2025, 6, 1),
    status: "ACTIVE",
    description: "1 TB cloud backup for personal files and photos.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["cloud", "backup", "personal"],
  },
  {
    name: "Acme Corp — Salario",
    contractType: "INCOME_SOURCE",
    categoryIndex: 8,
    providerIndex: 5,
    currency: "COP",
    initialAmount: 12_500_000,
    currentBalance: 12_500_000,
    startDate: dateOnly(2022, 2, 1),
    status: "ACTIVE",
    description: "Full-time software engineer salary, paid biweekly.",
    isRecurring: true,
    frequency: "BIWEEKLY",
    frequencyInDays: 14,
    variability: "FIXED",
    tags: ["salary", "employment", "primary-income", "w2"],
  },
  {
    name: "Freelance — Design Projects",
    contractType: "INCOME_SOURCE",
    categoryIndex: 9,
    providerIndex: 10,
    currency: "COP",
    initialAmount: 4_800_000,
    currentBalance: 3_200_000,
    startDate: dateOnly(2024, 6, 1),
    status: "ACTIVE",
    description:
      "Irregular freelance design income from 2–3 clients per month.",
    isRecurring: true,
    frequency: "IRREGULAR",
    variability: "VARIABLE",
    tags: ["freelance", "side-income", "1099", "creative"],
  },
  {
    name: "Rental — Apt. Chapinero",
    contractType: "INCOME_SOURCE",
    categoryIndex: 8,
    providerIndex: 10,
    currency: "COP",
    initialAmount: 2_800_000,
    currentBalance: 2_800_000,
    startDate: dateOnly(2023, 5, 1),
    endDate: dateOnly(2026, 4, 30),
    status: "INACTIVE",
    description: "Short-term rental ended — tenant moved out April 2026.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: ["rental", "passive-income", "real-estate", "ended"],
  },
  {
    name: "Home Mortgage — Bancolombia",
    contractType: "MORTGAGE",
    categoryIndex: 1,
    providerIndex: 1,
    currency: "COP",
    initialAmount: 380_000_000,
    currentBalance: 342_500_000,
    startDate: dateOnly(2020, 8, 15),
    endDate: dateOnly(2045, 8, 15),
    status: "ACTIVE",
    description: "30-year fixed mortgage on primary residence in Bogotá.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "FIXED",
    tags: [
      "housing",
      "mortgage",
      "long-term",
      "primary-residence",
      "fixed-rate",
    ],
  },
  {
    name: "Visa Platinum — Davivienda",
    contractType: "CREDIT_CARD",
    categoryIndex: 7,
    providerIndex: 2,
    currency: "COP",
    initialAmount: 8_000_000,
    currentBalance: 1_247_500,
    startDate: dateOnly(2021, 3, 1),
    status: "ACTIVE",
    description: "Rewards credit card with travel benefits, ~16% utilization.",
    isRecurring: true,
    frequency: "MONTHLY",
    frequencyInDays: 30,
    variability: "VARIABLE",
    tags: ["credit-card", "revolving", "rewards", "travel", "debt"],
  },
];

export async function seedRatesDemoRecords(
  context: RatesRecordSeedContext,
): Promise<void> {
  const ensure = (
    entityName: string,
    id: string,
    data: Record<string, unknown>,
  ) => ensureRatesRecord(context, entityName, id, data);

  for (let index = 1; index <= 10; index += 1) {
    await ensure("category", padId("rd_cat", index), {
      name: CATEGORY_NAMES[index - 1]!,
      type: CATEGORY_TYPES[index - 1]!,
      ...(index > 1 && index <= 3
        ? { parentId: padId("rd_cat", 1) }
        : index === 9
          ? { parentId: padId("rd_cat", 8) }
          : {}),
    });
  }

  for (let index = 1; index <= 10; index += 1) {
    await ensure("provider", padId("rd_prov", index), {
      name: PROVIDER_NAMES[index - 1]!,
      type: PROVIDER_TYPES[index - 1]!,
      website:
        index <= 4
          ? `https://example.com/${PROVIDER_NAMES[index - 1]!.toLowerCase().replace(/\s+/g, "")}`
          : undefined,
    });
  }

  for (let index = 1; index <= 10; index += 1) {
    await ensure("account", padId("rd_acc", index), {
      name: `${PROVIDER_NAMES[index - 1]!} Account`,
      accountType: ACCOUNT_TYPES[index - 1]!,
      providerId: padId("rd_prov", index),
      currency: index % 3 === 0 ? "USD" : "COP",
      balance: 500_000 + index * 125_000,
    });
  }

  for (let index = 0; index < CONTRACT_DEMO_SEEDS.length; index += 1) {
    const seed = CONTRACT_DEMO_SEEDS[index]!;
    await ensure("contract", padId("rd_con", index + 1), {
      name: seed.name,
      contractType: seed.contractType,
      categoryId: padId("rd_cat", seed.categoryIndex),
      providerId: padId("rd_prov", seed.providerIndex),
      currency: seed.currency,
      initialAmount: seed.initialAmount,
      currentBalance: seed.currentBalance,
      startDate: seed.startDate,
      ...(seed.endDate ? { endDate: seed.endDate } : {}),
      status: seed.status,
      description: seed.description,
      isRecurring: seed.isRecurring,
      ...(seed.frequency ? { frequency: seed.frequency } : {}),
      ...(seed.frequencyInDays !== undefined
        ? { frequencyInDays: seed.frequencyInDays }
        : {}),
      ...(seed.variability ? { variability: seed.variability } : {}),
      ...(seed.tags ? { tags: [...seed.tags] } : {}),
    });
  }

  for (let index = 1; index <= 10; index += 1) {
    await ensure("subscriptionDetails", padId("rd_subd", index), {
      contractId: padId("rd_con", index),
      planName: SUBSCRIPTION_PLANS[index - 1]!,
      startDate: dateOnly(2024, 2, 1),
      nextBillingDate: dateOnly(2026, 7, 1),
      autoRenew: index % 4 !== 0,
    });
  }

  const incomeContractIds = [
    "rd_con_11",
    "rd_con_12",
    "rd_con_13",
    "rd_con_08",
    "rd_con_09",
  ] as const;

  for (let index = 1; index <= 5; index += 1) {
    await ensure("incomeDetails", padId("rd_incd", index), {
      name: `${CATEGORY_NAMES[7 + (index % 2)]!} — ${index}`,
      contractId: incomeContractIds[index - 1]!,
      incomeType:
        index === 1
          ? "SALARY"
          : index === 2
            ? "FREELANCE"
            : index === 3
              ? "RENT"
              : index === 4
                ? "DIVIDEND"
                : "BUSINESS",
      expectedAmount: 3_500_000 + index * 500_000,
    });
  }

  const investmentContractIds = [
    "rd_con_06",
    "rd_con_07",
    "rd_con_10",
    "rd_con_11",
    "rd_con_12",
  ] as const;

  for (let index = 1; index <= 5; index += 1) {
    await ensure("investmentDetails", padId("rd_invd", index), {
      contractId: investmentContractIds[index - 1]!,
      expectedReturnRate: 0.05 + index * 0.01,
      riskLevel: index % 3 === 0 ? "HIGH" : index % 2 === 0 ? "MEDIUM" : "LOW",
      liquidity: index % 2 === 0 ? "HIGH" : "MEDIUM",
    });
  }

  for (let index = 1; index <= 5; index += 1) {
    await ensure("contractTerms", padId("rd_ctrm", index), {
      contractId: index % 2 === 0 ? "rd_con_14" : "rd_con_15",
      interestRate: 0.08 + index * 0.005,
      rateType: index % 2 === 0 ? "FIXED" : "VARIABLE",
      compoundingFrequency: "MONTHLY",
      paymentAmount: 1_200_000 + index * 100_000,
      paymentFrequency: "MONTHLY",
      totalPeriods: 240 - index * 12,
      amortizationType: index % 2 === 0 ? "FRENCH" : "GERMAN",
      gracePeriods: index === 5 ? 2 : undefined,
      effectiveDate: dateOnly(2023, 6, 1),
    });
  }

  for (
    let contractIndex = 1;
    contractIndex <= CONTRACT_DEMO_SEEDS.length;
    contractIndex += 1
  ) {
    const seed = CONTRACT_DEMO_SEEDS[contractIndex - 1]!;
    const contractId = padId("rd_con", contractIndex);

    for (let snap = 1; snap <= RATES_SNAPSHOTS_PER_CONTRACT; snap += 1) {
      const month = ((snap - 1) % 12) + 1;
      const balance =
        seed.contractType === "MORTGAGE"
          ? seed.currentBalance - snap * 1_800_000
          : seed.contractType === "CREDIT_CARD"
            ? seed.currentBalance + (snap % 2 === 0 ? 85_000 : -120_000)
            : seed.variability === "VARIABLE"
              ? seed.currentBalance +
                (snap % 3 === 0 ? 28_000 : snap % 2 === 0 ? -12_000 : 5_000)
              : seed.currentBalance;

      await ensure(
        "contractSnapshot",
        `${contractId}_snap_${String(snap).padStart(2, "0")}`,
        {
          contractId,
          date: monthStart(2025, month),
          balance,
          accruedInterest:
            seed.contractType === "MORTGAGE" ||
            seed.contractType === "CREDIT_CARD"
              ? snap * 2_500
              : undefined,
        },
      );
    }
  }

  for (const contractId of LOAN_CONTRACT_IDS) {
    for (let stmt = 1; stmt <= RATES_STATEMENTS_PER_LOAN_CONTRACT; stmt += 1) {
      const month = 4 + stmt;
      const periodStart = monthStart(2026, month);
      const periodEnd = dateOnly(2026, month, 28);
      await ensure(
        "statement",
        `${contractId}_stmt_${String(stmt).padStart(2, "0")}`,
        {
          contractId,
          periodStart,
          periodEnd,
          openingBalance: 12_000_000,
          closingBalance: 11_500_000 - stmt * 100_000,
          minimumPayment: 450_000,
          dueDate: dateOnly(2026, month + 1, 5),
          paidAmount: stmt === 1 ? 450_000 : undefined,
          status: stmt === 1 ? "PAID" : "PENDING",
        },
      );
    }
  }

  const transactionDescriptions = [
    "Groceries",
    "Salary deposit",
    "Uber ride",
    "Restaurant",
    "Transfer to savings",
    "Mortgage payment",
    "ETF purchase",
    "Bank fee",
    "Property tax",
    "Savings interest",
  ];

  for (let index = 1; index <= 50; index += 1) {
    const type =
      index % 5 === 0
        ? "INCOME"
        : TRANSACTION_TYPES[index % TRANSACTION_TYPES.length]!;
    const month = ((index - 1) % 12) + 1;
    const day = ((index - 1) % 27) + 1;

    await ensure("transaction", padId("rd_txn", index), {
      type,
      amount: 25_000 + index * 18_500,
      date: dateOnly(2025, month, day),
      accountId: padId("rd_acc", ((index - 1) % 10) + 1),
      categoryId: padId(
        "rd_cat",
        type === "INCOME" ? 8 : ((index - 1) % 7) + 1,
      ),
      contractId:
        index % 3 === 0 ? padId("rd_con", ((index - 1) % 15) + 1) : undefined,
      description: `${transactionDescriptions[index % transactionDescriptions.length]!} #${index}`,
    });
  }

  const fileTargets: ReadonlyArray<{
    readonly id: string;
    readonly parentType: "CONTRACT" | "TRANSACTION" | "STATEMENT";
    readonly contractId?: string;
    readonly transactionId?: string;
    readonly statementId?: string;
    readonly documentType: string;
    readonly name: string;
  }> = [
    {
      id: "rd_file_01",
      parentType: "CONTRACT",
      contractId: "rd_con_01",
      documentType: "CONTRACT_PDF",
      name: "Netflix agreement",
    },
    {
      id: "rd_file_02",
      parentType: "CONTRACT",
      contractId: "rd_con_05",
      documentType: "OTHER",
      name: "Service terms",
    },
    {
      id: "rd_file_03",
      parentType: "TRANSACTION",
      transactionId: "rd_txn_03",
      documentType: "RECEIPT",
      name: "Ride receipt",
    },
    {
      id: "rd_file_04",
      parentType: "TRANSACTION",
      transactionId: "rd_txn_12",
      documentType: "RECEIPT",
      name: "Restaurant receipt",
    },
    {
      id: "rd_file_05",
      parentType: "STATEMENT",
      statementId: "rd_con_14_stmt_01",
      documentType: "STATEMENT_PDF",
      name: "Mortgage statement Jan",
    },
    {
      id: "rd_file_06",
      parentType: "STATEMENT",
      statementId: "rd_con_15_stmt_01",
      documentType: "STATEMENT_PDF",
      name: "Card statement",
    },
    {
      id: "rd_file_07",
      parentType: "CONTRACT",
      contractId: "rd_con_14",
      documentType: "CONTRACT_PDF",
      name: "Mortgage deed",
    },
    {
      id: "rd_file_08",
      parentType: "TRANSACTION",
      transactionId: "rd_txn_25",
      documentType: "RECEIPT",
      name: "Online purchase",
    },
    {
      id: "rd_file_09",
      parentType: "CONTRACT",
      contractId: "rd_con_10",
      documentType: "OTHER",
      name: "Subscription invoice",
    },
    {
      id: "rd_file_10",
      parentType: "TRANSACTION",
      transactionId: "rd_txn_40",
      documentType: "RECEIPT",
      name: "Utility payment proof",
    },
  ];

  for (const file of fileTargets) {
    const document = await uploadRatesEmptyPdf(context, {
      entityName: "file",
      fieldName: "document",
      recordId: file.id,
      fileName: `${file.id}.pdf`,
    });

    if (!document) {
      continue;
    }

    await ensure("file", file.id, {
      parentType: file.parentType,
      ...(file.contractId ? { contractId: file.contractId } : {}),
      ...(file.transactionId ? { transactionId: file.transactionId } : {}),
      ...(file.statementId ? { statementId: file.statementId } : {}),
      documentType: file.documentType,
      name: file.name,
      document,
      uploadedAt: dateOnly(2026, 6, 1),
      tags: "demo,seed",
    });
  }
}
