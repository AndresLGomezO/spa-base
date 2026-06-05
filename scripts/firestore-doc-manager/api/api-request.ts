import { writeFileSync } from "node:fs";

import type { ApiAuthHeaders } from "./resolve-auth.js";

interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

interface ApiEnvelope<T> {
  readonly data: T | null;
  readonly error: ApiErrorBody | null;
}

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;
  readonly details?: unknown;

  constructor(statusCode: number, error: ApiErrorBody) {
    super(error.message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.code = error.code;
    this.fieldErrors = mapFieldErrors(error.details);
    this.details = error.details;
  }
}

function mapFieldErrors(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object") {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details)) {
    if (Array.isArray(messages) && messages.length > 0) {
      const first = messages[0];
      if (typeof first === "string") {
        fieldErrors[field] = first;
      }
    } else if (typeof messages === "string") {
      fieldErrors[field] = messages;
    }
  }
  return fieldErrors;
}

export interface ApiRequestOptions {
  readonly baseUrl: string;
  readonly auth: ApiAuthHeaders;
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly query?: Record<string, string | number | undefined>;
  readonly body?: unknown;
  readonly dryRun?: boolean;
  readonly out?: string;
  readonly pretty?: boolean;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | undefined>,
): URL {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function formatOutput(data: unknown, pretty: boolean): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

function printDryRun(options: ApiRequestOptions, url: URL): void {
  console.log(`[dry-run] ${options.method ?? "GET"} ${url.toString()}`);
  console.log("  Authorization: Bearer <redacted>");
  console.log("  X-Firebase-AppCheck: <redacted>");
  if (options.body !== undefined) {
    console.log(formatOutput(options.body, true));
  }
}

export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const url = buildUrl(options.baseUrl, options.path, options.query);

  if (options.dryRun) {
    printDryRun(options, url);
    return {} as T;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: options.auth.authorization,
      "X-Firebase-AppCheck": options.auth.appCheck,
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.error) {
    throw new ApiRequestError(
      response.status,
      payload.error ?? {
        code: "REQUEST_FAILED",
        message: "Request failed.",
      },
    );
  }

  if (payload.data === null) {
    throw new ApiRequestError(response.status, {
      code: "EMPTY_RESPONSE",
      message: "Response did not include data.",
    });
  }

  return payload.data;
}

export function writeApiOutput(
  data: unknown,
  options: { readonly out?: string; readonly pretty?: boolean },
): void {
  const pretty = options.pretty ?? true;
  if (options.out) {
    writeFileSync(options.out, formatOutput(data, true), "utf8");
    console.log(`Wrote response to ${options.out}`);
    return;
  }
  console.log(formatOutput(data, pretty));
}

export function printApiRequestError(error: ApiRequestError): void {
  console.error(`${error.message} (${error.code}, HTTP ${error.statusCode})`);
  const fieldNames = Object.keys(error.fieldErrors);
  if (fieldNames.length > 0) {
    console.error("Field errors:");
    for (const field of fieldNames) {
      console.error(`  ${field}: ${error.fieldErrors[field]}`);
    }
  }
}
