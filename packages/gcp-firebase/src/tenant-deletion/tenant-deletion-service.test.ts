import { beforeEach, describe, expect, it, vi } from "vitest";

import { FIRESTORE_BATCH_LIMIT } from "../firestore-bulk-helpers.js";
import { deleteAllTenantUserInvites } from "./tenant-deletion-service.js";

const mockBatch = {
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};

const mockFirestore = {
  batch: vi.fn(() => mockBatch),
  collection: vi.fn(),
};

const mockInvitesCollection = {
  get: vi.fn(),
};

vi.mock("../firebase-admin.js", () => ({
  getFirestoreAdmin: vi.fn(() => mockFirestore),
}));

vi.mock("../tenant-entity-path.js", () => ({
  tenantEntityCollectionRef: vi.fn(() => mockInvitesCollection),
}));

describe("deleteAllTenantUserInvites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch.delete.mockReset();
    mockBatch.commit.mockResolvedValue(undefined);
    mockFirestore.batch.mockReturnValue(mockBatch);
  });

  it("chunks deletes beyond the Firestore batch limit", async () => {
    const inviteCount = FIRESTORE_BATCH_LIMIT + 1;
    const inviteRefs = Array.from({ length: inviteCount }, (_, index) => ({
      id: `invite_${index}`,
      ref: {
        path: `tenants/t1/tenant_user_invites/invite_${index}`,
        firestore: mockFirestore,
      },
    }));

    mockInvitesCollection.get.mockResolvedValue({
      empty: false,
      size: inviteCount,
      docs: inviteRefs,
    });

    const deleted = await deleteAllTenantUserInvites(
      { projectId: "demo" },
      "t1",
    );

    expect(deleted).toBe(inviteCount);
    expect(mockFirestore.batch).toHaveBeenCalledTimes(2);
    expect(mockBatch.delete).toHaveBeenCalledTimes(inviteCount);
    expect(mockBatch.commit).toHaveBeenCalledTimes(2);
  });
});
