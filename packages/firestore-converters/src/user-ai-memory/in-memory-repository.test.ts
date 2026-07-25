import { describe, expect, it } from "vitest";

import { createInMemoryUserAiMemoryRepository } from "./in-memory-repository.js";
import { createInMemoryAiChatSessionRepository } from "../ai-chat-session/in-memory-repository.js";

describe("createInMemoryUserAiMemoryRepository", () => {
  it("upserts and clears vertex caches per tenant", async () => {
    const repo = createInMemoryUserAiMemoryRepository();
    const now = new Date().toISOString();
    await repo.upsert({
      id: "u1",
      tenantId: "t1",
      userId: "u1",
      profileFragment: "",
      dataSnapshot: "snap",
      factIndex: [],
      sourceHash: "h1",
      vertexCacheName: "cache-1",
      vertexCacheExpireAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const cleared = await repo.clearVertexCachesForTenant("t1");
    expect(cleared).toBe(1);
    const got = await repo.get("t1", "u1");
    expect(got?.vertexCacheName).toBeNull();
  });

  it("lists memories updated since a timestamp", async () => {
    const repo = createInMemoryUserAiMemoryRepository();
    await repo.upsert({
      id: "u1",
      tenantId: "t1",
      userId: "u1",
      profileFragment: "",
      dataSnapshot: "",
      factIndex: [],
      sourceHash: "h1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    });
    await repo.upsert({
      id: "u2",
      tenantId: "t1",
      userId: "u2",
      profileFragment: "",
      dataSnapshot: "",
      factIndex: [],
      sourceHash: "h2",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    const listed = await repo.listUpdatedSince(
      "t1",
      "2026-01-05T00:00:00.000Z",
    );
    expect(listed.map((m) => m.userId)).toEqual(["u1"]);
  });
});

describe("createInMemoryAiChatSessionRepository", () => {
  it("creates and updates sessions", async () => {
    const repo = createInMemoryAiChatSessionRepository();
    const session = await repo.create("t1", { userId: "u1" });
    expect(session.id).toMatch(/^aisess_/);
    const updated = await repo.update("t1", session.id, {
      messages: [
        {
          role: "user",
          content: "hello",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(updated.messages).toHaveLength(1);
  });
});
