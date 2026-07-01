import type { DataHookWebhookRequest } from "@repo/hooks";

import { HookExecutionError } from "@repo/hooks";

const WEBHOOK_TIMEOUT_MS = 10_000;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function assertAllowedWebhookUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new HookExecutionError("callWebhook url is not a valid URL.");
  }

  const allowHttp = process.env.NODE_ENV !== "production";
  if (
    parsed.protocol !== "https:" &&
    !(allowHttp && parsed.protocol === "http:")
  ) {
    throw new HookExecutionError(
      "callWebhook url must use HTTPS in production.",
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isPrivateIpv4(hostname)
  ) {
    throw new HookExecutionError("callWebhook url targets a blocked host.");
  }

  return parsed;
}

export async function callDataHookWebhook(
  request: DataHookWebhookRequest,
): Promise<void> {
  const parsedUrl = assertAllowedWebhookUrl(request.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HookExecutionError(
        `callWebhook request failed with status ${response.status}.`,
      );
    }
  } catch (error) {
    if (error instanceof HookExecutionError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new HookExecutionError("callWebhook request timed out.");
    }
    const message =
      error instanceof Error ? error.message : "callWebhook request failed.";
    throw new HookExecutionError(message);
  } finally {
    clearTimeout(timeout);
  }
}
