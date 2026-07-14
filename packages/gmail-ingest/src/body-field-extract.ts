import type { EmailAiExtractResult, EmailBodyFieldExtractor } from "./types.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLabeledValue(bodyText: string, label: string): string | null {
  const pattern = new RegExp(
    `^\\s*${escapeRegExp(label)}:\\s*(.+?)\\s*$`,
    "im",
  );
  const match = pattern.exec(bodyText);
  const value = match?.[1];
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Compile an extractor pattern. Supports `/source/flags` (flags default to empty
 * when omitted after the closing slash) or a raw regex source string.
 */
export function compileExtractorPattern(pattern: string): RegExp | null {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return null;
  }
  let source = trimmed;
  let flags = "";
  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    const lastSlash = trimmed.lastIndexOf("/");
    source = trimmed.slice(1, lastSlash);
    flags = trimmed.slice(lastSlash + 1);
  }
  if (!source) {
    return null;
  }
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

function extractPatternValue(
  bodyText: string,
  extractor: EmailBodyFieldExtractor,
): string | null {
  const patternText = extractor.pattern?.trim() ?? "";
  if (!patternText) {
    return null;
  }
  const regex = compileExtractorPattern(patternText);
  if (!regex) {
    return null;
  }
  const match = regex.exec(bodyText);
  if (!match) {
    return null;
  }
  const groupIndex = extractor.captureGroup ?? 1;
  const value = match[groupIndex] ?? match[0];
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function transformAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (cleaned.length === 0) {
    return null;
  }
  // Prefer comma-as-thousands when both separators are absent or comma-only.
  // "8,098" → 8098; "8.098,50" European → 8098.50; "8098.50" → 8098.5
  let normalized = cleaned;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && (parts[1]?.length ?? 0) <= 2) {
      normalized = `${parts[0]}.${parts[1]}`;
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function transformSlashDate(raw: string): string | null {
  const trimmed = raw.trim();

  // DD/MM/YY[YY] [a las HH:mm[:ss]]
  const dmyTime =
    /^(\d{2})[/-](\d{2})[/-](\d{2}|\d{4})(?:\s+a las\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/i.exec(
      trimmed,
    );
  if (dmyTime) {
    const day = dmyTime[1]!;
    const month = dmyTime[2]!;
    let year = dmyTime[3]!;
    if (year.length === 2) {
      year = `20${year}`;
    }
    const hour = dmyTime[4];
    const minute = dmyTime[5];
    const second = dmyTime[6] ?? "00";
    if (hour != null && minute != null) {
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }
    return `${year}-${month}-${day}`;
  }

  const ymd = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(trimmed);
  if (ymd) {
    return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  }
  // PSE / LatAm: DD/MM/YYYY or DD-MM-YYYY
  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  }
  return null;
}

function transformCompactYmd(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) {
    return null;
  }
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

const MONTH_NAME_TO_NUMBER: Readonly<Record<string, string>> = {
  jan: "01",
  january: "01",
  ene: "01",
  enero: "01",
  feb: "02",
  february: "02",
  febrero: "02",
  mar: "03",
  march: "03",
  marzo: "03",
  apr: "04",
  april: "04",
  abr: "04",
  abril: "04",
  may: "05",
  mayo: "05",
  jun: "06",
  june: "06",
  junio: "06",
  jul: "07",
  july: "07",
  julio: "07",
  aug: "08",
  august: "08",
  ago: "08",
  agosto: "08",
  sep: "09",
  sept: "09",
  september: "09",
  set: "09",
  septiembre: "09",
  oct: "10",
  october: "10",
  octubre: "10",
  nov: "11",
  november: "11",
  noviembre: "11",
  dec: "12",
  december: "12",
  dic: "12",
  diciembre: "12",
};

/** Parses `15/Jul/2026`, `15-Jul-2026`, `15 Jul 2026` (EN/ES month names). */
function transformMonthNameDate(raw: string): string | null {
  const match =
    /^(\d{1,2})[/\-\s]+([A-Za-zÁÉÍÓÚáéíóúüñÑ.]{3,})[/\-\s]+(\d{4})$/u.exec(
      raw.trim(),
    );
  if (!match) {
    return null;
  }
  const day = match[1]!.padStart(2, "0");
  const monthKey = match[2]!.replace(/\./g, "").toLowerCase();
  const year = match[3]!;
  const month = MONTH_NAME_TO_NUMBER[monthKey];
  if (!month) {
    return null;
  }
  const d = Number(day);
  if (!Number.isFinite(d) || d < 1 || d > 31) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function transformValueMap(
  raw: string,
  valueMap: Readonly<Record<string, string>> | undefined,
): string {
  const trimmed = raw.trim();
  if (!valueMap) {
    return trimmed;
  }
  if (trimmed in valueMap) {
    return valueMap[trimmed]!;
  }
  const withoutTrailingDot = trimmed.replace(/\.+\s*$/, "").trim();
  if (withoutTrailingDot in valueMap) {
    return valueMap[withoutTrailingDot]!;
  }
  // Case-insensitive fallback
  const lower = trimmed.toLowerCase();
  for (const [key, mapped] of Object.entries(valueMap)) {
    if (key.toLowerCase() === lower) {
      return mapped;
    }
    if (key.toLowerCase() === withoutTrailingDot.toLowerCase()) {
      return mapped;
    }
  }
  return trimmed;
}

function applyTransform(
  raw: string,
  extractor: EmailBodyFieldExtractor,
): unknown {
  const transform = extractor.transform ?? "trim";
  switch (transform) {
    case "trim":
      return raw.trim();
    case "amount":
      return transformAmount(raw);
    case "slashDate":
      return transformSlashDate(raw);
    case "compactYmd":
      return transformCompactYmd(raw);
    case "monthNameDate":
      return transformMonthNameDate(raw);
    case "valueMap":
      return transformValueMap(raw, extractor.valueMap);
    case "literal":
      return extractor.literal ?? null;
    default: {
      const exhaustive: never = transform;
      return exhaustive;
    }
  }
}

/**
 * Parse email body fields into Email Ingest fields.
 * Supports `Label: value` lines and/or full-body `pattern` capture groups.
 * Always sets `isReversal: false` unless an extractor writes that field.
 */
export function extractBodyFields(
  bodyText: string | null | undefined,
  extractors: readonly EmailBodyFieldExtractor[],
): EmailAiExtractResult {
  const text = bodyText ?? "";
  const fields: Record<string, unknown> = {};

  for (const extractor of extractors) {
    const transform = extractor.transform ?? "trim";
    if (transform === "literal") {
      if (extractor.literal != null && extractor.literal.length > 0) {
        fields[extractor.field] = extractor.literal;
      }
      continue;
    }

    let raw: string | null = null;
    const patternText = extractor.pattern?.trim() ?? "";
    if (patternText) {
      raw = extractPatternValue(text, extractor);
    } else {
      const label = extractor.label?.trim() ?? "";
      if (!label) {
        continue;
      }
      raw = extractLabeledValue(text, label);
    }
    if (raw == null) {
      continue;
    }
    const value = applyTransform(raw, extractor);
    if (value == null) {
      continue;
    }
    fields[extractor.field] = value;
  }

  if (fields.isReversal === undefined) {
    fields.isReversal = false;
  }
  fields.extractSource = "manual";

  // Combine Fecha + Hora into a full ISO datetime when both are present.
  const datePart = typeof fields.date === "string" ? fields.date.trim() : "";
  const timePart = typeof fields.time === "string" ? fields.time.trim() : "";
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(datePart) &&
    /^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/.test(timePart)
  ) {
    const normalizedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
    fields.date = `${datePart}T${normalizedTime}`;
  }

  // Combine Descripción + CUS into a single description when both extracted.
  const descriptionPart =
    typeof fields.description === "string" ? fields.description.trim() : "";
  const cusPart = typeof fields.cus === "string" ? fields.cus.trim() : "";
  if (descriptionPart && cusPart) {
    fields.description = `${descriptionPart} · CUS ${cusPart}`;
  } else if (!descriptionPart && cusPart) {
    fields.description = `CUS ${cusPart}`;
  }

  const amount = fields.amount;
  const hasAmount =
    typeof amount === "number"
      ? Number.isFinite(amount)
      : typeof amount === "string" && amount.trim().length > 0;

  // Statement / period-closing extracts mark relevance via extractor flag.
  const hasSufficientRelevanceField = extractors.some((extractor) => {
    if (!extractor.sufficientForRelevance) return false;
    const value = fields[extractor.field];
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });

  if (!hasAmount && !hasSufficientRelevanceField) {
    return {
      relevant: false,
      reason: "Body field extract: amount missing or invalid",
      fields,
    };
  }

  return {
    relevant: true,
    reason: hasAmount
      ? "Body field extract"
      : "Body field extract: relevance field present",
    fields,
  };
}
