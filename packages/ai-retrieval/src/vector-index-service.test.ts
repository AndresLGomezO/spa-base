import { describe, expect, it } from "vitest";

import { createInMemoryVectorIndexClient } from "./in-memory-vector-index.js";
import {
  buildVectorDatapointId,
  parseVectorDatapointId,
  VectorIndexService,
} from "./vector-index-service.js";

describe("vector datapoint ids", () => {
  it("builds and parses record identities", () => {
    const id = buildVectorDatapointId("tenant-a", "invoice", "record-1");
    expect(id).toBe("tenant-a:invoice:record-1");
    expect(parseVectorDatapointId(id)).toEqual({
      tenantId: "tenant-a",
      entityName: "invoice",
      recordId: "record-1",
    });
  });

  it("rejects malformed identities", () => {
    expect(parseVectorDatapointId("missing-parts")).toBeNull();
    expect(parseVectorDatapointId("tenant:entity:record:extra")).toBeNull();
    expect(() => buildVectorDatapointId("tenant:bad", "entity", "id")).toThrow(
      'must not contain ":"',
    );
  });
});

describe("in-memory vector index", () => {
  it("sorts cosine neighbors and replaces existing datapoints", async () => {
    const client = createInMemoryVectorIndexClient({ dimensions: 2 });
    await client.upsert([
      {
        id: "tenant:note:first",
        embedding: [1, 0],
        restricts: {
          tenantId: "tenant",
          entityName: "note",
          accessUserIds: ["user"],
          tenantWideRead: false,
        },
      },
      {
        id: "tenant:note:second",
        embedding: [0, 1],
        restricts: {
          tenantId: "tenant",
          entityName: "note",
          accessUserIds: ["user"],
          tenantWideRead: false,
        },
      },
    ]);

    await client.upsert([
      {
        id: "tenant:note:second",
        embedding: [0.9, 0.1],
        restricts: {
          tenantId: "tenant",
          entityName: "note",
          accessUserIds: ["user"],
          tenantWideRead: false,
        },
      },
    ]);

    const results = await client.findNeighbors({
      embedding: [1, 0],
      topK: 2,
      restricts: { tenantId: "tenant", userId: "user" },
    });
    expect(results.map((result) => result.id)).toEqual([
      "tenant:note:first",
      "tenant:note:second",
    ]);
    expect(results[0]?.score).toBeCloseTo(1);
    expect(results[0]?.distance).toBeCloseTo(0);
  });

  it("filters by tenant, entity, and record ACL", async () => {
    const client = createInMemoryVectorIndexClient({ dimensions: 2 });
    await client.upsert([
      {
        id: "tenant-a:note:private",
        embedding: [1, 0],
        restricts: {
          tenantId: "tenant-a",
          entityName: "note",
          accessUserIds: ["allowed-user"],
          tenantWideRead: false,
        },
      },
      {
        id: "tenant-a:note:wide",
        embedding: [1, 0],
        restricts: {
          tenantId: "tenant-a",
          entityName: "note",
          accessUserIds: [],
          tenantWideRead: true,
        },
      },
      {
        id: "tenant-a:task:other-entity",
        embedding: [1, 0],
        restricts: {
          tenantId: "tenant-a",
          entityName: "task",
          accessUserIds: [],
          tenantWideRead: true,
        },
      },
      {
        id: "tenant-b:note:other-tenant",
        embedding: [1, 0],
        restricts: {
          tenantId: "tenant-b",
          entityName: "note",
          accessUserIds: [],
          tenantWideRead: true,
        },
      },
    ]);

    const results = await client.findNeighbors({
      embedding: [1, 0],
      topK: 10,
      restricts: {
        tenantId: "tenant-a",
        entityName: "note",
        userId: "different-user",
      },
    });
    expect(results.map((result) => result.id)).toEqual(["tenant-a:note:wide"]);
  });

  it("removes datapoints and validates dimensions", async () => {
    const client = createInMemoryVectorIndexClient({ dimensions: 2 });
    await expect(
      client.upsert([
        {
          id: "bad",
          embedding: [1],
          restricts: {
            tenantId: "tenant",
            entityName: "note",
            accessUserIds: [],
            tenantWideRead: true,
          },
        },
      ]),
    ).rejects.toThrow("Expected embedding dimension 2");

    await client.upsert([
      {
        id: "tenant:note:record",
        embedding: [1, 0],
        restricts: {
          tenantId: "tenant",
          entityName: "note",
          accessUserIds: [],
          tenantWideRead: true,
        },
      },
    ]);
    await client.remove(["tenant:note:record"]);
    await expect(
      client.findNeighbors({
        embedding: [1, 0],
        topK: 10,
        restricts: { tenantId: "tenant", userId: "user" },
      }),
    ).resolves.toEqual([]);
  });
});

describe("VectorIndexService", () => {
  it("upserts, queries, applies minScore, and removes records", async () => {
    const client = createInMemoryVectorIndexClient({ dimensions: 3 });
    const service = new VectorIndexService(client, { dimensions: 3 });

    await service.upsertRecord({
      tenantId: "tenant",
      entityName: "document",
      recordId: "best",
      embedding: [1, 0, 0],
      accessUserIds: ["user", "user"],
    });
    await service.upsertRecord({
      tenantId: "tenant",
      entityName: "document",
      recordId: "weak",
      embedding: [0.5, 0.5, 0],
      tenantWideRead: true,
    });

    const results = await service.queryTopK({
      tenantId: "tenant",
      userId: "user",
      entityName: "document",
      embedding: [1, 0, 0],
      topK: 10,
      minScore: 0.9,
    });
    expect(results).toEqual([
      {
        tenantId: "tenant",
        entityName: "document",
        recordId: "best",
        score: 1,
      },
    ]);

    await service.removeRecord({
      tenantId: "tenant",
      entityName: "document",
      recordId: "best",
    });
    await expect(
      service.queryTopK({
        tenantId: "tenant",
        userId: "user",
        embedding: [1, 0, 0],
        minScore: 0.9,
      }),
    ).resolves.toEqual([]);
  });

  it("validates query and upsert dimensions", async () => {
    const service = new VectorIndexService(createInMemoryVectorIndexClient(), {
      dimensions: 3,
    });
    await expect(
      service.upsertRecord({
        tenantId: "tenant",
        entityName: "note",
        recordId: "record",
        embedding: [1, 0],
      }),
    ).rejects.toThrow("Expected 3 finite embedding values");
    await expect(
      service.queryTopK({
        tenantId: "tenant",
        userId: "user",
        embedding: [1, 0, 0],
        topK: 0,
      }),
    ).rejects.toThrow("topK must be a positive integer");
  });
});
