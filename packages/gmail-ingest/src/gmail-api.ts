import type { GmailMessageEnvelope } from "./types.js";

interface GmailHeader {
  readonly name?: string;
  readonly value?: string;
}

interface GmailMessagePart {
  readonly mimeType?: string;
  readonly body?: { readonly data?: string };
  readonly parts?: readonly GmailMessagePart[];
}

interface GmailApiMessage {
  readonly id: string;
  readonly threadId?: string;
  readonly snippet?: string;
  readonly payload?: {
    readonly headers?: readonly GmailHeader[];
    readonly mimeType?: string;
    readonly body?: { readonly data?: string };
    readonly parts?: readonly GmailMessagePart[];
  };
  readonly internalDate?: string;
}

function headerValue(
  headers: readonly GmailHeader[] | undefined,
  name: string,
): string {
  const found = headers?.find(
    (header) => header.name?.toLowerCase() === name.toLowerCase(),
  );
  return found?.value?.trim() ?? "";
}

function decodeBase64Url(data: string | undefined): string | null {
  if (!data) return null;
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function extractPlainText(part: GmailMessagePart | undefined): string | null {
  if (!part) return null;
  if (part.mimeType === "text/plain") {
    return decodeBase64Url(part.body?.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      const text = extractPlainText(child);
      if (text) return text;
    }
  }
  return null;
}

export function gmailApiMessageToEnvelope(
  message: GmailApiMessage,
): GmailMessageEnvelope {
  const headers = message.payload?.headers;
  const dateHeader = headerValue(headers, "Date");
  const internalMs = message.internalDate
    ? Number.parseInt(message.internalDate, 10)
    : Number.NaN;
  const date = dateHeader
    ? new Date(dateHeader).toISOString()
    : Number.isFinite(internalMs)
      ? new Date(internalMs).toISOString()
      : null;

  const bodyText = extractPlainText(message.payload);
  return {
    messageId: message.id,
    threadId: message.threadId ?? null,
    from: headerValue(headers, "From") || "unknown",
    subject: headerValue(headers, "Subject"),
    snippet: message.snippet ?? "",
    date,
    bodyText: bodyText ? bodyText.slice(0, 8_000) : null,
  };
}

export class GmailApiClient {
  constructor(private readonly accessToken: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          ...(init?.headers ?? {}),
        },
      },
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gmail API ${path} failed: ${response.status} ${body.slice(0, 400)}`,
      );
    }
    return (await response.json()) as T;
  }

  async getProfile(): Promise<{ readonly emailAddress: string }> {
    return this.request<{ emailAddress: string }>("/users/me/profile");
  }

  async listMessageIds(options: {
    readonly query: string;
    readonly maxResults?: number;
    readonly pageToken?: string;
  }): Promise<{
    readonly messageIds: readonly string[];
    readonly nextPageToken: string | null;
  }> {
    const params = new URLSearchParams({
      q: options.query,
      maxResults: String(options.maxResults ?? 50),
    });
    if (options.pageToken) {
      params.set("pageToken", options.pageToken);
    }
    const result = await this.request<{
      messages?: readonly { id: string }[];
      nextPageToken?: string;
    }>(`/users/me/messages?${params.toString()}`);
    return {
      messageIds: (result.messages ?? []).map((message) => message.id),
      nextPageToken: result.nextPageToken ?? null,
    };
  }

  async getMessage(messageId: string): Promise<GmailMessageEnvelope> {
    const message = await this.request<GmailApiMessage>(
      `/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    );
    return gmailApiMessageToEnvelope(message);
  }

  async listHistoryMessageIds(historyId: string): Promise<{
    readonly messageIds: readonly string[];
    readonly latestHistoryId: string | null;
  }> {
    const params = new URLSearchParams({
      startHistoryId: historyId,
      historyTypes: "messageAdded",
    });
    const result = await this.request<{
      history?: readonly {
        messagesAdded?: readonly { message?: { id?: string } }[];
      }[];
      historyId?: string;
    }>(`/users/me/history?${params.toString()}`);

    const ids = new Set<string>();
    for (const entry of result.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        if (added.message?.id) ids.add(added.message.id);
      }
    }
    return {
      messageIds: [...ids],
      latestHistoryId: result.historyId ?? null,
    };
  }

  async watch(topicName: string): Promise<{
    readonly historyId: string;
    readonly expiration: string;
  }> {
    return this.request("/users/me/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
      }),
    });
  }
}
