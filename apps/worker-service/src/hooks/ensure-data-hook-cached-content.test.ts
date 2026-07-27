import { describe, expect, it, vi } from "vitest";
import { createMockVertexCachedContentClient } from "@repo/ai-engine/grounded-chat";
import { createInMemoryDataHookAiCacheRepository } from "@repo/firestore-converters";

import {
  ensureDataHookCachedContent,
  hashDataHookAiPrefix,
} from "./ensure-data-hook-cached-content.js";

const config = {
  projectId: "demo",
  region: "us-central1",
  modelId: "gemini-3.6-flash",
  reasoningModelId: "gemini-3.1-pro-preview",
  mockEnabled: false,
};

describe("ensureDataHookCachedContent", () => {
  it("creates a cache and reuses it when prefixHash matches", async () => {
    const cacheClient = createMockVertexCachedContentClient();
    const createSpy = vi.spyOn(cacheClient, "create");
    const cacheRepository = createInMemoryDataHookAiCacheRepository();
    const prefixText = "## entity:category\n[]\n\n---\n\n";
    const systemInstruction = "Reply with JSON only.";

    const first = await ensureDataHookCachedContent({
      config,
      cacheClient,
      cacheRepository,
      tenantId: "tenant_a",
      hookId: "hook_classify",
      systemInstruction,
      prefixText,
    });
    expect(first.cachedContentName).toMatch(/cachedContents\/mock-/);
    expect(createSpy).toHaveBeenCalledOnce();

    const second = await ensureDataHookCachedContent({
      config,
      cacheClient,
      cacheRepository,
      tenantId: "tenant_a",
      hookId: "hook_classify",
      systemInstruction,
      prefixText,
    });
    expect(second.cachedContentName).toBe(first.cachedContentName);
    expect(createSpy).toHaveBeenCalledOnce();
  });

  it("recreates when prefixHash changes", async () => {
    const cacheClient = createMockVertexCachedContentClient();
    const createSpy = vi.spyOn(cacheClient, "create");
    const deleteSpy = vi.spyOn(cacheClient, "delete");
    const cacheRepository = createInMemoryDataHookAiCacheRepository();

    const first = await ensureDataHookCachedContent({
      config,
      cacheClient,
      cacheRepository,
      tenantId: "tenant_a",
      hookId: "hook_classify",
      systemInstruction: "sys",
      prefixText: "catalog-v1",
    });
    const second = await ensureDataHookCachedContent({
      config,
      cacheClient,
      cacheRepository,
      tenantId: "tenant_a",
      hookId: "hook_classify",
      systemInstruction: "sys",
      prefixText: "catalog-v2",
    });

    expect(deleteSpy).toHaveBeenCalledOnce();
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(second.cachedContentName).not.toBe(first.cachedContentName);
    expect(second.record.prefixHash).toBe(
      hashDataHookAiPrefix({
        systemInstruction: "sys",
        prefixText: "catalog-v2",
      }),
    );
  });

  it("falls back to null cache name when create fails", async () => {
    const cacheClient = createMockVertexCachedContentClient();
    vi.spyOn(cacheClient, "create").mockRejectedValueOnce(
      new Error("Vertex unavailable"),
    );
    const cacheRepository = createInMemoryDataHookAiCacheRepository();

    const result = await ensureDataHookCachedContent({
      config,
      cacheClient,
      cacheRepository,
      tenantId: "tenant_a",
      hookId: "hook_classify",
      systemInstruction: "sys",
      prefixText: "catalog",
    });

    expect(result.cachedContentName).toBeNull();
    expect(result.record.cachedContentName).toBeNull();
  });
});
