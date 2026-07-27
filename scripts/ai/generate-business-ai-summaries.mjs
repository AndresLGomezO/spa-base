/**
 * Generates business-entity AI summary data-hooks and local seed docs for
 * grounded chat RAG (actor, account, transaction, email, paymentSchedule,
 * statement, balanceSnapshot).
 *
 * Usage: node scripts/ai/generate-business-ai-summaries.mjs
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const IMPORT_DIR = join(ROOT, ".local/tenant-import");
const HOOKS_DIR = join(IMPORT_DIR, "catalogs/data-hooks");
const SEEDS_DIR = join(IMPORT_DIR, "ai-record-summaries");

const NOW = "2026-07-25T00:00:00.000Z";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function field(path) {
  return { kind: "field", source: "current", path };
}

function lit(value) {
  return { kind: "literal", value };
}

function concat(...args) {
  return { kind: "call", fn: "concat", args };
}

/** Nest concat calls so each stays within the expression engine's 16-arg limit. */
function concatSafe(...parts) {
  const MAX = 12;
  if (parts.length <= MAX) {
    return concat(...parts);
  }
  const chunks = [];
  for (let i = 0; i < parts.length; i += MAX) {
    chunks.push(concat(...parts.slice(i, i + MAX)));
  }
  return concatSafe(...chunks);
}

function toText(node) {
  return { kind: "call", fn: "toText", args: [node] };
}

function coalesce(...args) {
  return { kind: "call", fn: "coalesce", args };
}

/** Build a JSON object string expression from field paths (values via toText). */
function jsonObjectExpr(entries) {
  const parts = [lit("{")];
  entries.forEach(([key, node], index) => {
    if (index > 0) parts.push(lit(","));
    parts.push(lit(`"${key}":`));
    parts.push(lit('"'));
    parts.push(toText(coalesce(node, lit(""))));
    parts.push(lit('"'));
  });
  parts.push(lit("}"));
  return concatSafe(...parts);
}

function buildRefreshHook({
  name,
  description,
  entity,
  order,
  fields,
  updateFields,
}) {
  const contextExpr = jsonObjectExpr(fields);
  return {
    kind: "data-hook-definition",
    version: 1,
    data: {
      name,
      description,
      entity,
      phase: "after",
      trigger: {
        kind: "crud",
        operations: [
          { operation: "create" },
          { operation: "update", updateFields },
        ],
      },
      condition: null,
      actions: [
        {
          type: "upsertAiRecordContext",
          context: contextExpr,
          ragText: contextExpr,
          enqueueNarrative: false,
          as: "aiContext",
        },
      ],
      enabled: true,
      order,
      execution: "deferred",
    },
  };
}

const HOOK_SPECS = [
  {
    file: "refresh-actor-ai-summary-json.json",
    name: "Refresh actor AI summary JSON",
    description:
      "Upsert ai_record_summaries for actors (name/type) for grounded chat RAG.",
    entity: "actor",
    order: 90,
    fields: [
      ["id", field("id")],
      ["name", field("name")],
      ["type", field("type")],
      ["website", field("website")],
    ],
    updateFields: ["name", "type", "website"],
  },
  {
    file: "refresh-account-ai-summary-json.json",
    name: "Refresh account AI summary JSON",
    description:
      "Upsert ai_record_summaries for accounts (balances + actor link) for grounded chat RAG.",
    entity: "account",
    order: 91,
    fields: [
      ["id", field("id")],
      ["name", field("name")],
      ["accountType", field("accountType")],
      ["actorId", field("actorId")],
      ["currency", field("currency")],
      ["currentBalance", field("currentBalance")],
    ],
    updateFields: [
      "name",
      "accountType",
      "actorId",
      "currency",
      "currentBalance",
    ],
  },
  {
    file: "refresh-email-ai-summary-json.json",
    name: "Refresh email AI summary JSON",
    description:
      "Upsert ai_record_summaries for emails (subject/from/status/match; body omitted for PII) for grounded chat RAG.",
    entity: "email",
    order: 93,
    fields: [
      ["id", field("id")],
      ["subject", field("subject")],
      ["fromAddress", field("fromAddress")],
      ["receivedAt", field("receivedAt")],
      ["status", field("status")],
      ["matchRecordId", field("matchRecordId")],
      ["snippet", field("snippet")],
    ],
    updateFields: [
      "subject",
      "fromAddress",
      "receivedAt",
      "status",
      "matchRecordId",
      "snippet",
    ],
  },
  {
    file: "refresh-payment-schedule-ai-summary-json.json",
    name: "Refresh payment schedule AI summary JSON",
    description:
      "Upsert ai_record_summaries for payment schedules for grounded chat RAG.",
    entity: "paymentSchedule",
    order: 94,
    fields: [
      ["id", field("id")],
      ["financialItemId", field("financialItemId")],
      ["dueDate", field("dueDate")],
      ["expectedAmount", field("expectedAmount")],
      ["status", field("status")],
      ["sequence", field("sequence")],
      ["paidTransactionId", field("paidTransactionId")],
    ],
    updateFields: [
      "financialItemId",
      "dueDate",
      "expectedAmount",
      "status",
      "sequence",
      "paidTransactionId",
    ],
  },
  {
    file: "refresh-statement-ai-summary-json.json",
    name: "Refresh statement AI summary JSON",
    description:
      "Upsert ai_record_summaries for statements for grounded chat RAG.",
    entity: "statement",
    order: 95,
    fields: [
      ["id", field("id")],
      ["accountId", field("accountId")],
      ["periodStart", field("periodStart")],
      ["periodEnd", field("periodEnd")],
      ["openingBalance", field("openingBalance")],
      ["closingBalance", field("closingBalance")],
    ],
    updateFields: [
      "accountId",
      "periodStart",
      "periodEnd",
      "openingBalance",
      "closingBalance",
    ],
  },
  {
    file: "refresh-balance-snapshot-ai-summary-json.json",
    name: "Refresh balance snapshot AI summary JSON",
    description:
      "Upsert ai_record_summaries for balance snapshots for grounded chat RAG.",
    entity: "balanceSnapshot",
    order: 96,
    fields: [
      ["id", field("id")],
      ["financialItemId", field("financialItemId")],
      ["date", field("date")],
      ["balance", field("balance")],
    ],
    updateFields: ["financialItemId", "date", "balance"],
  },
];

function loadRecords(entity) {
  const items = [];
  for (const root of ["records", "generated"]) {
    const dir = join(IMPORT_DIR, root, entity);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const raw = JSON.parse(readFileSync(join(dir, file), "utf8"));
      if (Array.isArray(raw)) {
        for (const row of raw) {
          if (row && typeof row === "object" && typeof row.id === "string") {
            items.push(row);
          }
        }
      } else if (raw && typeof raw.id === "string") {
        items.push(raw);
      }
    }
  }
  return items;
}

function pickContext(entity, record) {
  switch (entity) {
    case "actor":
      return {
        id: record.id,
        name: record.name ?? "",
        type: record.type ?? "",
        website: record.website ?? "",
      };
    case "account":
      return {
        id: record.id,
        name: record.name ?? "",
        accountType: record.accountType ?? "",
        actorId: record.actorId ?? "",
        currency: record.currency ?? "",
        currentBalance: record.currentBalance ?? "",
      };
    case "transaction":
      return {
        id: record.id,
        type: record.type ?? "",
        amount: record.amount ?? "",
        date: record.date ?? "",
        description: record.description ?? "",
        accountId: record.accountId ?? "",
        financialItemId: record.financialItemId ?? "",
        paymentScheduleId: record.paymentScheduleId ?? "",
        categoryId: record.categoryId ?? "",
      };
    case "email":
      return {
        id: record.id,
        subject: record.subject ?? "",
        fromAddress: record.fromAddress ?? "",
        receivedAt: record.receivedAt ?? "",
        status: record.status ?? "",
        matchRecordId: record.matchRecordId ?? "",
        snippet: record.snippet ?? "",
      };
    case "paymentSchedule":
      return {
        id: record.id,
        financialItemId: record.financialItemId ?? "",
        dueDate: record.dueDate ?? "",
        expectedAmount: record.expectedAmount ?? "",
        status: record.status ?? "",
        sequence: record.sequence ?? "",
        paidTransactionId: record.paidTransactionId ?? "",
      };
    case "statement":
      return {
        id: record.id,
        accountId: record.accountId ?? "",
        periodStart: record.periodStart ?? "",
        periodEnd: record.periodEnd ?? "",
        openingBalance: record.openingBalance ?? "",
        closingBalance: record.closingBalance ?? "",
      };
    case "balanceSnapshot":
      return {
        id: record.id,
        financialItemId: record.financialItemId ?? "",
        date: record.date ?? "",
        balance: record.balance ?? "",
      };
    default:
      return { id: record.id };
  }
}

function writeSeed(entity, record) {
  const context = pickContext(entity, record);
  // Match hook ragText: stringify all values as JSON strings.
  const ragObj = Object.fromEntries(
    Object.entries(context).map(([k, v]) => [k, String(v ?? "")]),
  );
  const ragText = JSON.stringify(ragObj);
  const contextHash = sha256(JSON.stringify(context));
  const ragHash = sha256(ragText);
  const doc = {
    id: `${entity}__${record.id}`,
    entityName: entity,
    recordId: record.id,
    accessUserIds: [],
    tenantWideRead: false,
    context,
    contextHash,
    rag: {
      text: ragText,
      hash: ragHash,
      sourceHash: contextHash,
      updatedAt: NOW,
    },
    narratives: {},
    createdAt: NOW,
    updatedAt: NOW,
  };
  writeFileSync(
    join(SEEDS_DIR, `${entity}__${record.id}.json`),
    `${JSON.stringify(doc, null, 2)}\n`,
  );
}

mkdirSync(HOOKS_DIR, { recursive: true });
mkdirSync(SEEDS_DIR, { recursive: true });

for (const spec of HOOK_SPECS) {
  const hook = buildRefreshHook(spec);
  writeFileSync(
    join(HOOKS_DIR, spec.file),
    `${JSON.stringify(hook, null, 2)}\n`,
  );
  console.log(`wrote hook ${spec.file}`);
}

const SEED_ENTITIES = [
  "actor",
  "account",
  "transaction",
  "email",
  "paymentSchedule",
  "statement",
  "balanceSnapshot",
];

// Cap high-volume entities to keep seed size reasonable while covering Q&A.
const CAPS = {
  transaction: 120,
  paymentSchedule: 120,
  balanceSnapshot: 80,
};

for (const entity of SEED_ENTITIES) {
  let records = loadRecords(entity);
  if (entity === "paymentSchedule") {
    records = [...records].sort((a, b) =>
      String(b.dueDate ?? "").localeCompare(String(a.dueDate ?? "")),
    );
  } else if (entity === "transaction" || entity === "balanceSnapshot") {
    records = [...records].sort((a, b) =>
      String(b.date ?? "").localeCompare(String(a.date ?? "")),
    );
  }
  const cap = CAPS[entity];
  if (cap != null) {
    records = records.slice(0, cap);
  }
  for (const record of records) {
    writeSeed(entity, record);
  }
  console.log(`seeded ${records.length} ${entity} summaries`);
}

console.log("done");
