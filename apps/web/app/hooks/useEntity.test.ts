import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api-client", () => ({
  listEntity: vi.fn(),
  getEntity: vi.fn(),
  createEntity: vi.fn(),
  updateEntity: vi.fn(),
  deleteEntity: vi.fn(),
  isApiClientError: vi.fn(() => false),
}));

vi.mock("../entities/entity-catalog-context", () => ({
  useEntityDefinition: vi.fn(() => ({
    name: "organization",
    collection: "organizations",
    permissions: [],
    fields: {},
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
    },
  })),
}));

import {
  createEntity,
  deleteEntity,
  listEntity,
  updateEntity,
} from "../lib/api-client";
import { useEntity } from "./useEntity";

describe("useEntity", () => {
  beforeEach(() => {
    vi.mocked(listEntity).mockResolvedValue({
      items: [{ id: "1", tenantId: "tenant_a", name: "Jane" }],
      nextCursor: null,
    });
  });

  it("loads entity list on mount", async () => {
    const { result } = renderHook(() => useEntity("organization"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(listEntity).toHaveBeenCalledWith("organization", {
      limit: 20,
      cursor: undefined,
      query: undefined,
    });
  });

  it("creates records through the API", async () => {
    vi.mocked(createEntity).mockResolvedValue({
      id: "2",
      tenantId: "tenant_a",
      name: "New",
    });

    const { result } = renderHook(() => useEntity("organization"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const created = await result.current.create({ name: "New" });
    expect(created?.id).toBe("2");
  });

  it("deletes records through the API", async () => {
    vi.mocked(deleteEntity).mockResolvedValue({ deleted: true });

    const { result } = renderHook(() => useEntity("organization"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const deleted = await result.current.remove("1");
    expect(deleted).toBe(true);
    expect(updateEntity).not.toHaveBeenCalled();
  });
});
