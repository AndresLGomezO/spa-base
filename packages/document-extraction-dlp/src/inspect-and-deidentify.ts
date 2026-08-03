export type DlpFinding = {
  infoType: string;
  quote?: string;
  likelihood: string;
  action: "redacted" | "masked" | "kept";
};

export type DlpResult = {
  redactedJson: unknown;
  findings: DlpFinding[];
  preview: Record<string, unknown>;
};

export interface DlpClient {
  inspectAndDeidentify(
    json: unknown,
    options?: { additionalInfoTypes?: string[] },
  ): Promise<DlpResult>;
}

export const DEFAULT_INFO_TYPES = [
  "US_SOCIAL_SECURITY_NUMBER",
  "CREDIT_CARD_NUMBER",
  "IBAN_CODE",
  "FINANCIAL_ACCOUNT_NUMBER",
  "US_INDIVIDUAL_TAXPAYER_IDENTIFICATION_NUMBER",
] as const;

const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g;
const LONG_DIGIT_RE = /\b\d{9,}\b/g;

const SAFE_KEY_RE =
  /^(statementDate|closingDate|openingDate|dueDate|paymentDueDate|currency|amount|balance|closingBalance|openingBalance|minimumPayment|last4|accountLast4|cardLast4|productLast4|transactions|items|description|memo|date|postingDate|merchant|category)$/i;

const ENCRYPTED_KEY_RE = /Encrypted$/i;
const LAST4_KEY_RE = /Last4$/i;

function maskLast4(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `****${digits.slice(-4)}`;
  }
  return "REDACTED";
}

function redactStringValue(
  value: string,
  findings: DlpFinding[],
): { value: string; changed: boolean } {
  let next = value;
  let changed = false;

  next = next.replace(SSN_RE, (match) => {
    findings.push({
      infoType: "US_SOCIAL_SECURITY_NUMBER",
      quote: match,
      likelihood: "LIKELY",
      action: "redacted",
    });
    changed = true;
    return "[REDACTED_SSN]";
  });

  next = next.replace(CREDIT_CARD_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      return match;
    }
    findings.push({
      infoType: "CREDIT_CARD_NUMBER",
      quote: match,
      likelihood: "LIKELY",
      action: "masked",
    });
    changed = true;
    return maskLast4(match);
  });

  next = next.replace(IBAN_RE, (match) => {
    findings.push({
      infoType: "IBAN_CODE",
      quote: match,
      likelihood: "POSSIBLE",
      action: "redacted",
    });
    changed = true;
    return "[REDACTED_IBAN]";
  });

  return { value: next, changed };
}

function deidentifyValue(value: unknown, findings: DlpFinding[]): unknown {
  if (typeof value === "string") {
    return redactStringValue(value, findings).value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deidentifyValue(item, findings));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = deidentifyValue(child, findings);
    }
    return out;
  }
  return value;
}

function previewValue(key: string, value: unknown): unknown {
  if (ENCRYPTED_KEY_RE.test(key) && typeof value === "string") {
    return maskLast4(value);
  }
  if (typeof value === "string") {
    if (LONG_DIGIT_RE.test(value) && !LAST4_KEY_RE.test(key)) {
      LONG_DIGIT_RE.lastIndex = 0;
      return value.replace(LONG_DIGIT_RE, (match) => maskLast4(match));
    }
    LONG_DIGIT_RE.lastIndex = 0;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return buildPreview(item);
      }
      return item;
    });
  }
  if (value && typeof value === "object") {
    return buildPreview(value);
  }
  return value;
}

/**
 * Builds a review-safe preview: omits `*Encrypted` keys (replaced with masked
 * last-4 under a parallel preview key where possible), keeps safe financial
 * fields, and masks remaining long digit sequences.
 */
export function buildPreview(json: unknown): Record<string, unknown> {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {};
  }

  const source = json as Record<string, unknown>;
  const preview: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (ENCRYPTED_KEY_RE.test(key)) {
      const base = key.replace(ENCRYPTED_KEY_RE, "");
      const last4Key = `${base}Last4`;
      if (typeof value === "string") {
        preview[last4Key] = maskLast4(value);
      } else {
        preview[key.replace(ENCRYPTED_KEY_RE, "Redacted")] = "REDACTED";
      }
      continue;
    }

    if (
      SAFE_KEY_RE.test(key) ||
      LAST4_KEY_RE.test(key) ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      preview[key] = previewValue(key, value);
      continue;
    }

    if (typeof value === "string") {
      const masked = previewValue(key, value);
      if (typeof masked === "string" && masked !== value) {
        preview[key] = masked;
      } else if (value.length <= 64) {
        preview[key] = value;
      }
      continue;
    }

    if (Array.isArray(value) || (value && typeof value === "object")) {
      preview[key] = previewValue(key, value);
    }
  }

  return preview;
}

function mockInspectAndDeidentify(json: unknown): DlpResult {
  const findings: DlpFinding[] = [];
  const redactedJson = deidentifyValue(json, findings);
  return {
    redactedJson,
    findings,
    preview: buildPreview(redactedJson),
  };
}

/**
 * Regex-based DLP for local/dev/tests. Detects SSN, credit-card-like numbers,
 * and IBANs in string leaves; builds a masked preview for UI review.
 */
export function createMockDlpClient(): DlpClient {
  return {
    async inspectAndDeidentify(json) {
      return mockInspectAndDeidentify(json);
    },
  };
}

export type GcpDlpClientOptions = {
  readonly projectId: string;
};

/**
 * Cloud DLP client (`inspectContent` + `deidentifyContent`).
 *
 * Uses a dynamic import of `@google-cloud/dlp` so unit tests and local runs
 * that only need the mock client do not require the native client at load time.
 * If the GCP call fails, callers should fall back to `createMockDlpClient()`
 * (this factory does not auto-fallback — soft-fail is the caller's concern).
 */
export function createGcpDlpClient(options: GcpDlpClientOptions): DlpClient {
  let clientPromise: Promise<{
    inspectContent: (request: unknown) => Promise<[unknown]>;
    deidentifyContent: (request: unknown) => Promise<[unknown]>;
  }> | null = null;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const dlpModule = await import("@google-cloud/dlp");
        const DlpServiceClient =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic CJS/ESM interop
          (dlpModule as any).DlpServiceClient ??
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (dlpModule as any).default?.DlpServiceClient;
        if (!DlpServiceClient) {
          throw new Error("@google-cloud/dlp DlpServiceClient not found");
        }
        return new DlpServiceClient();
      })();
    }
    return clientPromise;
  }

  return {
    async inspectAndDeidentify(json, requestOptions) {
      const infoTypes = [
        ...DEFAULT_INFO_TYPES,
        ...(requestOptions?.additionalInfoTypes ?? []),
      ].map((name) => ({ name }));

      const item = {
        value: JSON.stringify(json),
      };

      const client = await getClient();
      const parent = `projects/${options.projectId}/locations/global`;

      const [inspectResponse] = await client.inspectContent({
        parent,
        inspectConfig: {
          infoTypes,
          minLikelihood: "POSSIBLE",
          includeQuote: true,
        },
        item,
      });

      const findings: DlpFinding[] = [];
      const inspectFindings =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((inspectResponse as any)?.result?.findings ?? []) as Array<{
          infoType?: { name?: string | null };
          quote?: string | null;
          likelihood?: string | null;
        }>;

      for (const finding of inspectFindings) {
        findings.push({
          infoType: finding.infoType?.name ?? "UNKNOWN",
          ...(finding.quote ? { quote: finding.quote } : {}),
          likelihood: finding.likelihood ?? "POSSIBLE",
          action: "redacted",
        });
      }

      const [deidentifyResponse] = await client.deidentifyContent({
        parent,
        deidentifyConfig: {
          infoTypeTransformations: {
            transformations: [
              {
                infoTypes,
                primitiveTransformation: {
                  replaceWithInfoTypeConfig: {},
                },
              },
            ],
          },
        },
        inspectConfig: {
          infoTypes,
          minLikelihood: "POSSIBLE",
        },
        item,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const redactedText = (deidentifyResponse as any)?.item?.value as
        | string
        | undefined;

      let redactedJson: unknown = json;
      if (typeof redactedText === "string") {
        try {
          redactedJson = JSON.parse(redactedText) as unknown;
        } catch {
          redactedJson = { redactedText };
        }
      }

      return {
        redactedJson,
        findings,
        preview: buildPreview(redactedJson),
      };
    },
  };
}

/**
 * Convenience helper that runs inspect+deidentify via the given client
 * (defaults to the mock client).
 */
export async function inspectAndDeidentify(
  json: unknown,
  options?: {
    additionalInfoTypes?: string[];
    client?: DlpClient;
  },
): Promise<DlpResult> {
  const client = options?.client ?? createMockDlpClient();
  return client.inspectAndDeidentify(json, {
    additionalInfoTypes: options?.additionalInfoTypes,
  });
}
