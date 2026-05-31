import { describe, expect, it } from "vitest";

import {
  buildInitialOwnershipFields,
  buildRecordAccessMeta,
  canDeleteRecord,
  canManageShares,
  canReadRecord,
  canWriteRecord,
  shouldBypassOwnershipFilter,
} from "./record-access.js";

const ownerContext = {
  userId: "user_owner",
  permissions: ["widget.read", "widget.update", "widget.delete"],
};

const otherContext = {
  userId: "user_other",
  permissions: ["widget.read", "widget.update", "widget.delete"],
};

const adminContext = {
  userId: "user_admin",
  permissions: ["widget.read_all", "widget.write_all", "widget.delete_all"],
};

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec_1",
    tenantId: "tenant_a",
    ...buildInitialOwnershipFields("user_owner"),
    name: "Owned widget",
    ...overrides,
  };
}

describe("record-access", () => {
  it("allows owners full control", () => {
    const record = buildRecord();
    expect(canReadRecord(record, "widget", ownerContext)).toBe(true);
    expect(canWriteRecord(record, "widget", ownerContext)).toBe(true);
    expect(canDeleteRecord(record, "widget", ownerContext)).toBe(true);
    expect(canManageShares(record, "widget", ownerContext)).toBe(true);
  });

  it("denies other users by default", () => {
    const record = buildRecord();
    expect(canReadRecord(record, "widget", otherContext)).toBe(false);
    expect(canWriteRecord(record, "widget", otherContext)).toBe(false);
    expect(canDeleteRecord(record, "widget", otherContext)).toBe(false);
  });

  it("allows read/write for shared collaborators", () => {
    const readShared = buildRecord({
      sharedWith: { user_other: "read" },
      accessUserIds: ["user_owner", "user_other"],
    });
    const writeShared = buildRecord({
      sharedWith: { user_other: "write" },
      accessUserIds: ["user_owner", "user_other"],
    });

    expect(canReadRecord(readShared, "widget", otherContext)).toBe(true);
    expect(canWriteRecord(readShared, "widget", otherContext)).toBe(false);
    expect(canDeleteRecord(readShared, "widget", otherContext)).toBe(false);

    expect(canWriteRecord(writeShared, "widget", otherContext)).toBe(true);
    expect(canManageShares(writeShared, "widget", otherContext)).toBe(false);
  });

  it("bypasses ownership for read_all and tenantWideRead", () => {
    const record = buildRecord();
    expect(shouldBypassOwnershipFilter("widget", adminContext)).toBe(true);
    expect(
      shouldBypassOwnershipFilter("widget", otherContext, {
        tenantWideRead: true,
      }),
    ).toBe(true);
    expect(canReadRecord(record, "widget", adminContext)).toBe(true);
    expect(canWriteRecord(record, "widget", adminContext)).toBe(true);
    expect(canDeleteRecord(record, "widget", adminContext)).toBe(true);
  });

  it("builds access metadata for API responses", () => {
    const record = buildRecord({
      sharedWith: { user_other: "write" },
      accessUserIds: ["user_owner", "user_other"],
    });

    expect(buildRecordAccessMeta(record, "widget", ownerContext)).toEqual(
      expect.objectContaining({
        isOwner: true,
        sharePermission: null,
        canManageShares: true,
      }),
    );

    expect(buildRecordAccessMeta(record, "widget", otherContext)).toEqual(
      expect.objectContaining({
        isOwner: false,
        sharePermission: "write",
        canWrite: true,
        canDelete: false,
        canManageShares: false,
      }),
    );
  });
});
