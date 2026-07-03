import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  copyTenantToArchiveMirror,
  purgeLiveTenantData,
} from "./document-tree.js";

type SuccessCallback = () => void;

const mockBulkWriter = {
  set: vi.fn(),
  delete: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  onWriteError: vi.fn(),
  onWriteResult: vi.fn(),
  _successCallback: undefined as SuccessCallback | undefined,
};

const mockFirestore = {
  bulkWriter: vi.fn(() => mockBulkWriter),
  recursiveDelete: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
};

vi.mock("../firebase-admin.js", () => ({
  getFirestoreAdmin: vi.fn(() => mockFirestore),
}));

function createDocRef(path: string, data?: Record<string, unknown>) {
  const subcollections = new Map<
    string,
    ReturnType<typeof createCollectionRef>
  >();
  const ref = {
    path,
    firestore: mockFirestore,
    get: vi.fn().mockResolvedValue({
      exists: data !== undefined,
      data: () => data,
    }),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((id: string) => {
      if (!subcollections.has(id)) {
        subcollections.set(id, createCollectionRef(`${path}/${id}`));
      }
      return subcollections.get(id)!;
    }),
    listCollections: vi.fn().mockResolvedValue([]),
  };
  return ref;
}

function createCollectionRef(path: string) {
  const docs = new Map<string, ReturnType<typeof createDocRef>>();
  const collection = {
    id: path.split("/").at(-1) ?? path,
    path,
    firestore: mockFirestore,
    doc: vi.fn((id: string) => {
      if (!docs.has(id)) {
        docs.set(id, createDocRef(`${path}/${id}`));
      }
      return docs.get(id)!;
    }),
    get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
    listCollections: vi.fn().mockResolvedValue([]),
  };
  return collection;
}

function resetMocks() {
  vi.clearAllMocks();
  mockBulkWriter.set.mockReset();
  mockBulkWriter.close.mockResolvedValue(undefined);
  mockBulkWriter._successCallback = undefined;
  mockFirestore.bulkWriter.mockReturnValue(mockBulkWriter);
  mockFirestore.recursiveDelete.mockResolvedValue(undefined);

  mockBulkWriter.onWriteResult.mockImplementation(
    (callback: SuccessCallback) => {
      mockBulkWriter._successCallback = callback;
    },
  );
  mockBulkWriter.onWriteError.mockImplementation(() => undefined);
}

describe("document-tree bulk operations", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("copyTenantToArchiveMirror enqueues writes via BulkWriter", async () => {
    const entityDoc = createDocRef("tenants/t1/batches/b1", { name: "Batch" });
    entityDoc.listCollections.mockResolvedValue([]);

    const batchesCollection = createCollectionRef("tenants/t1/batches");
    batchesCollection.get.mockResolvedValue({
      docs: [{ id: "b1", ref: entityDoc }],
      empty: false,
    });

    const tenantRef = createDocRef("tenants/t1");
    tenantRef.listCollections.mockResolvedValue([batchesCollection]);

    const mirrorRootRef = createDocRef(
      "tenant_deletion_archives/a1/mirror/root",
    );
    const archiveRef = createDocRef("tenant_deletion_archives/a1");
    archiveRef.collection.mockImplementation((id: string) => {
      if (id === "mirror") {
        return {
          doc: vi.fn(() => mirrorRootRef),
        } as never;
      }
      return createCollectionRef(`tenant_deletion_archives/a1/${id}`);
    });

    mockFirestore.collection.mockImplementation((name: string) => {
      if (name === "tenants") {
        return { doc: vi.fn(() => tenantRef) };
      }
      if (name === "tenant_deletion_archives") {
        return { doc: vi.fn(() => archiveRef) };
      }
      return createCollectionRef(name);
    });

    mockBulkWriter.set.mockImplementation(() => {
      mockBulkWriter._successCallback?.();
    });

    const result = await copyTenantToArchiveMirror({
      config: { projectId: "demo" },
      tenantId: "t1",
      archiveId: "a1",
    });

    expect(mockFirestore.bulkWriter).toHaveBeenCalled();
    expect(mockBulkWriter.set).toHaveBeenCalledTimes(1);
    expect(entityDoc.set).not.toHaveBeenCalled();
    expect(mockBulkWriter.close).toHaveBeenCalled();
    expect(result.docsCopied).toBe(1);
    expect(result.collectionsCopied).toBe(1);
  });

  it("purgeLiveTenantData uses recursiveDelete with BulkWriter", async () => {
    const tenantRef = createDocRef("tenants/t1");
    const batchesCollection = createCollectionRef("tenants/t1/batches");
    tenantRef.listCollections.mockResolvedValue([batchesCollection]);

    mockFirestore.collection.mockImplementation((name: string) => {
      if (name === "tenants") {
        return { doc: vi.fn(() => tenantRef) };
      }
      return createCollectionRef(name);
    });

    mockFirestore.recursiveDelete.mockImplementation(async () => {
      mockBulkWriter._successCallback?.();
      mockBulkWriter._successCallback?.();
    });

    const onProgress = vi.fn();
    await purgeLiveTenantData({
      config: { projectId: "demo" },
      tenantId: "t1",
      onProgress,
    });

    expect(mockFirestore.recursiveDelete).toHaveBeenCalledWith(
      tenantRef,
      mockBulkWriter,
    );
    expect(mockBulkWriter.close).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({ collectionsCopied: 1 });
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ docsDeleted: expect.any(Number) }),
    );
  });
});
