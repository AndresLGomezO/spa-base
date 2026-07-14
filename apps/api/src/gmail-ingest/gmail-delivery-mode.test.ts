import { describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

vi.mock("@repo/gmail-ingest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/gmail-ingest")>();
  return {
    ...actual,
    GmailApiClient: vi.fn(function MockGmailApiClient() {
      return {
        getProfile: vi.fn().mockResolvedValue({
          emailAddress: "user@example.com",
          historyId: "123",
        }),
        watch: vi.fn(),
      };
    }),
  };
});

import { registerGmailIngestRoutes } from "./register-gmail-ingest-routes.js";

describe("gmail pubsub delivery mode", () => {
  it("returns 204 without lookup when mode is poll", async () => {
    const findByEmail = vi.fn();
    const enqueueWindowSync = vi.fn();
    const app = Fastify();
    await registerGmailIngestRoutes(app, {
      authenticate: async () => undefined,
      getDeliveryMode: async () => "poll",
      gmailConnectionRepository: {
        get: vi.fn(),
        findByEmail,
        listConnected: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      emailMatchBindingRepository: {} as never,
      emailIngestJobRepository: {
        create: vi.fn(),
      } as never,
      gmailTasksClient: {
        enqueueWindowSync,
      } as never,
      entityRuntime: {} as never,
      oauth: null,
    });

    const payload = Buffer.from(
      JSON.stringify({ emailAddress: "user@example.com", historyId: "9" }),
    ).toString("base64");

    const response = await app.inject({
      method: "POST",
      url: "/api/gmail/pubsub",
      payload: { message: { data: payload } },
    });

    expect(response.statusCode).toBe(204);
    expect(findByEmail).not.toHaveBeenCalled();
    expect(enqueueWindowSync).not.toHaveBeenCalled();
    await app.close();
  });
});
