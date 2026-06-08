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

function padId(prefix: string, index: number): string {
  return `${prefix}_${String(index).padStart(2, "0")}`;
}

function dateOnly(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthStart(year: number, month: number): string {
  return dateOnly(year, month, 1);
}

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

  for (let index = 1; index <= 15; index += 1) {
    const isSubscription = index <= 10;
    const contractType = isSubscription
      ? "SUBSCRIPTION"
      : index <= 13
        ? "INCOME_SOURCE"
        : index === 14
          ? "MORTGAGE"
          : "CREDIT_CARD";

    await ensure("contract", padId("rd_con", index), {
      name: isSubscription
        ? `${PROVIDER_NAMES[index - 1]!} ${SUBSCRIPTION_PLANS[index - 1]!}`
        : index <= 13
          ? `Income — ${CATEGORY_NAMES[Math.min(index - 1, 9)]!}`
          : index === 14
            ? "Home Mortgage"
            : "Visa Platinum",
      contractType,
      categoryId: padId(
        "rd_cat",
        index > 10 && index <= 13 ? 8 : Math.min(index, 7),
      ),
      providerId: padId("rd_prov", Math.min(index, 10)),
      currency: index % 4 === 0 ? "USD" : "COP",
      initialAmount: 1_000_000 + index * 250_000,
      currentBalance: 900_000 + index * 200_000,
      startDate: dateOnly(2024, 1 + (index % 12), 1),
      endDate: index % 5 === 0 ? dateOnly(2027, 12, 31) : undefined,
      status: "ACTIVE",
      description: `Demo contract ${index}`,
      isRecurring: true,
      frequency: "MONTHLY",
      frequencyInDays: 30,
      variability: index % 2 === 0 ? "FIXED" : "VARIABLE",
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

  for (let contractIndex = 1; contractIndex <= 15; contractIndex += 1) {
    const contractId = padId("rd_con", contractIndex);
    const baseBalance = 900_000 + contractIndex * 200_000;

    for (let snap = 1; snap <= RATES_SNAPSHOTS_PER_CONTRACT; snap += 1) {
      const month = ((snap - 1) % 12) + 1;
      await ensure(
        "contractSnapshot",
        `${contractId}_snap_${String(snap).padStart(2, "0")}`,
        {
          contractId,
          date: monthStart(2025, month),
          balance: baseBalance - snap * 15_000,
          accruedInterest: contractIndex >= 14 ? snap * 2_500 : undefined,
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
