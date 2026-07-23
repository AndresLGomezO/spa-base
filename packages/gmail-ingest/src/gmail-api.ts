import type { GmailMessageAttachment, GmailMessageEnvelope } from "./types.js";

interface GmailHeader {
  readonly name?: string;
  readonly value?: string;
}

interface GmailMessagePartBody {
  readonly data?: string;
  readonly attachmentId?: string;
  readonly size?: number;
}

interface GmailMessagePart {
  readonly mimeType?: string;
  readonly filename?: string;
  readonly body?: GmailMessagePartBody;
  readonly parts?: readonly GmailMessagePart[];
}

interface GmailApiMessage {
  readonly id: string;
  readonly threadId?: string;
  readonly snippet?: string;
  readonly payload?: {
    readonly headers?: readonly GmailHeader[];
    readonly mimeType?: string;
    readonly filename?: string;
    readonly body?: GmailMessagePartBody;
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

import { decodeHtmlEntities } from "./html-entities.js";

function decodeBase64UrlText(data: string | undefined): string | null {
  if (!data) return null;
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function decodeBase64UrlBuffer(data: string | undefined): Buffer | null {
  if (!data) return null;
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}

function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function extractPartText(
  part: GmailMessagePart | undefined,
  mimeType: "text/plain" | "text/html",
): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType) {
    const decoded = decodeBase64UrlText(part.body?.data);
    if (!decoded) return null;
    return mimeType === "text/html" ? htmlToPlainText(decoded) : decoded;
  }
  if (part.parts) {
    for (const child of part.parts) {
      const text = extractPartText(child, mimeType);
      if (text) return text;
    }
  }
  return null;
}

function extractBodyText(part: GmailMessagePart | undefined): string | null {
  const plain = extractPartText(part, "text/plain");
  if (plain?.trim()) return decodeHtmlEntities(plain);
  const html = extractPartText(part, "text/html");
  if (html?.trim()) return html;
  return null;
}

function isPdfAttachment(part: GmailMessagePart): boolean {
  const mime = (part.mimeType ?? "").toLowerCase();
  const filename = (part.filename ?? "").toLowerCase();
  return mime.includes("pdf") || filename.endsWith(".pdf");
}

/** Collect PDF attachment metadata from a full Gmail message payload. */
export function listPdfAttachmentsFromPayload(
  part: GmailMessagePart | undefined,
): GmailMessageAttachment[] {
  const found: GmailMessageAttachment[] = [];

  function walk(node: GmailMessagePart | undefined): void {
    if (!node) return;
    const attachmentId = node.body?.attachmentId?.trim();
    if (attachmentId && isPdfAttachment(node)) {
      found.push({
        attachmentId,
        filename:
          (node.filename ?? "attachment.pdf").trim() || "attachment.pdf",
        mimeType:
          (node.mimeType ?? "application/pdf").trim() || "application/pdf",
        size: typeof node.body?.size === "number" ? node.body.size : 0,
      });
    }
    if (node.parts) {
      for (const child of node.parts) {
        walk(child);
      }
    }
  }

  walk(part);
  return found;
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

  const bodyText = extractBodyText(message.payload);
  const rfcMessageId = headerValue(headers, "Message-ID") || null;
  return {
    messageId: message.id,
    threadId: message.threadId ?? null,
    rfcMessageId,
    from: headerValue(headers, "From") || "unknown",
    subject: headerValue(headers, "Subject"),
    snippet: message.snippet ?? "",
    date,
    bodyText: bodyText ? bodyText.slice(0, 8_000) : null,
    attachments: listPdfAttachmentsFromPayload(message.payload),
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

  async getProfile(): Promise<{
    readonly emailAddress: string;
    readonly historyId?: string;
  }> {
    return this.request<{ emailAddress: string; historyId?: string }>(
      "/users/me/profile",
    );
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

  async getAttachment(
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    const result = await this.request<{ data?: string; size?: number }>(
      `/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    );
    const buffer = decodeBase64UrlBuffer(result.data);
    if (!buffer) {
      throw new Error(
        `Gmail attachment ${attachmentId} for message ${messageId} returned empty data.`,
      );
    }
    return buffer;
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
