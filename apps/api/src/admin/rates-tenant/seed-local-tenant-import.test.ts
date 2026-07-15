import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { RATES_GCP_DEMO_OWNER_UID } from "./constants.js";
import {
  enrichFinancialItemRecordsWithActorLogos,
  filterImportRecordsByIds,
  filterImportSpecsByEntityNames,
  listPresentLocalGeneratedImportSpecs,
  listPresentLocalImportSpecs,
  normalizeLocalImportRecord,
  readEntityImageFileName,
  resolveEntityImageContentType,
  resolveLocalTenantImportOwnerEmail,
  verifyGcpImportOwner,
} from "./seed-local-tenant-import.js";

const getUserByEmail = vi.fn();

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    getUserByEmail,
  }),
}));

vi.mock("@repo/gcp-firebase", () => ({
  initializeFirebaseAdmin: vi.fn(),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: RATES_GCP_DEMO_OWNER_UID,
    email: "andreslgomezo@gmail.com",
    emailVerified: true,
    displayName: null,
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    providerData: [],
    metadata: { creationTime: "", lastSignInTime: "" },
  })),
  mapFirebaseUserRecordToAuthUserProjection: vi.fn((record) => record),
  createFirestoreAdminRegisteredUserRepository: vi.fn(() => ({
    upsertFromAuthUser: vi.fn(),
    getByUid: vi.fn(async () => ({ tenants: {} })),
    updateAccess: vi.fn(async () => true),
  })),
  setFirebaseUserCustomClaims: vi.fn(),
}));

describe("seed-local-tenant-import", () => {
  it("lists only record directories that contain JSON files", () => {
    const importDir = mkdtempSync(join(tmpdir(), "tenant-import-"));
    mkdirSync(join(importDir, "records/actor"), { recursive: true });
    mkdirSync(join(importDir, "records/category"), { recursive: true });
    writeFileSync(
      join(importDir, "records/actor/a1.json"),
      JSON.stringify({ id: "a1", name: "A" }),
    );
    writeFileSync(
      join(importDir, "records/category/c1.json"),
      JSON.stringify({ id: "c1", name: "C" }),
    );

    const specs = listPresentLocalImportSpecs(importDir);
    expect(specs.map((spec) => spec.dirName)).toEqual([
      "records/category",
      "records/actor",
    ]);
  });

  it("filters import specs and records by entity name / id", () => {
    const specs = filterImportSpecsByEntityNames(
      [
        { dirName: "records/actor", entityName: "actor" },
        { dirName: "records/financialItem", entityName: "financialItem" },
      ],
      ["financialItem"],
    );
    expect(specs).toEqual([
      { dirName: "records/financialItem", entityName: "financialItem" },
    ]);

    const records = filterImportRecordsByIds(
      [
        { id: "keep-me", name: "A" },
        { id: "skip-me", name: "B" },
      ],
      new Set(["keep-me"]),
    );
    expect(records).toEqual([{ id: "keep-me", name: "A" }]);
  });

  it("returns empty list when import directory has no known JSON files", () => {
    const importDir = mkdtempSync(join(tmpdir(), "tenant-import-empty-"));
    expect(listPresentLocalImportSpecs(importDir)).toEqual([]);
  });

  it("lists generated import directories when present", () => {
    const importDir = mkdtempSync(join(tmpdir(), "tenant-import-generated-"));
    mkdirSync(join(importDir, "generated/paymentSchedule"), {
      recursive: true,
    });
    mkdirSync(join(importDir, "generated/transaction"), { recursive: true });
    writeFileSync(
      join(importDir, "generated/paymentSchedule/fi1.json"),
      "[]",
    );
    writeFileSync(join(importDir, "generated/transaction/fi1.json"), "[]");

    const specs = listPresentLocalGeneratedImportSpecs(importDir);
    expect(specs.map((spec) => spec.dirName)).toEqual([
      "generated/paymentSchedule",
      "generated/transaction",
    ]);
  });

  it("resolves owner email from bootstrap env with fallback", () => {
    expect(typeof resolveLocalTenantImportOwnerEmail()).toBe("string");
    expect(resolveLocalTenantImportOwnerEmail().length).toBeGreaterThan(0);
  });

  it("replaces TENANT_ID placeholders in imported records", () => {
    const normalized = normalizeLocalImportRecord("rates", {
      id: "actor_1",
      logo: {
        storagePath: "tenants/TENANT_ID/entity-files/actor/logo.png",
        fileName: "logo.png",
        contentType: "image/png",
      },
    });

    expect(normalized.logo).toEqual({
      storagePath: "tenants/rates/entity-files/actor/logo.png",
      fileName: "logo.png",
      contentType: "image/png",
    });
  });

  it("resolves supported entity image content types", () => {
    expect(resolveEntityImageContentType("logo.png")).toBe("image/png");
    expect(resolveEntityImageContentType("photo.jpg")).toBe("image/jpeg");
    expect(resolveEntityImageContentType("icon.webp")).toBe("image/webp");
    expect(resolveEntityImageContentType("logo.gif")).toBeNull();
  });

  it("reads entity image file names from logo or image fields", () => {
    const record = {
      id: "cat_1",
      image: { fileName: "category-income.png" },
      logo: { fileName: "actor.png" },
    };

    expect(readEntityImageFileName(record, "image")).toBe(
      "category-income.png",
    );
    expect(readEntityImageFileName(record, "logo")).toBe("actor.png");
    expect(readEntityImageFileName(record, "missing")).toBeNull();
  });

  it("derives financialItem image refs from linked actor logos", () => {
    const actorLogoById = new Map([
      ["86ee2d42-7f39-443d-89c4-e5f4d0de0acb", "visa.png"],
      ["be666406-f9f4-44e9-9e97-c66675718ef2", "mastercard.png"],
    ]);

    const enriched = enrichFinancialItemRecordsWithActorLogos(
      [
        {
          id: "b3068c84-4703-45b5-998a-dea3fb9b880a",
          name: "Visa Signature",
          actorId: "86ee2d42-7f39-443d-89c4-e5f4d0de0acb",
        },
        {
          id: "9f660323-25ca-413c-86a8-710a375be97f",
          name: "Mastercard Black",
          actorId: "be666406-f9f4-44e9-9e97-c66675718ef2",
        },
        {
          id: "no-actor",
          name: "Cash buffer",
        },
        {
          id: "explicit-image",
          name: "Custom image",
          actorId: "86ee2d42-7f39-443d-89c4-e5f4d0de0acb",
          image: {
            fileName: "custom.png",
            contentType: "image/png",
            storagePath:
              "tenants/TENANT_ID/entity-files/financialItem/custom.png",
          },
        },
      ],
      actorLogoById,
    );

    expect(readEntityImageFileName(enriched[0]!, "image")).toBe("visa.png");
    expect(readEntityImageFileName(enriched[1]!, "image")).toBe(
      "mastercard.png",
    );
    expect(readEntityImageFileName(enriched[2]!, "image")).toBeNull();
    expect(readEntityImageFileName(enriched[3]!, "image")).toBe("custom.png");
  });
});

describe("verifyGcpImportOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts the expected Firebase UID for andreslgomezo@gmail.com", async () => {
    getUserByEmail.mockResolvedValue({
      uid: RATES_GCP_DEMO_OWNER_UID,
      email: "andreslgomezo@gmail.com",
    });

    await expect(
      verifyGcpImportOwner(
        "rates",
        { projectId: "entitysystem-development" },
        "andreslgomezo@gmail.com",
        RATES_GCP_DEMO_OWNER_UID,
      ),
    ).resolves.toBe(RATES_GCP_DEMO_OWNER_UID);
  });

  it("fails when Firebase UID does not match the expected constant", async () => {
    getUserByEmail.mockResolvedValue({
      uid: "different-uid",
      email: "andreslgomezo@gmail.com",
    });

    await expect(
      verifyGcpImportOwner(
        "rates",
        { projectId: "entitysystem-development" },
        "andreslgomezo@gmail.com",
        RATES_GCP_DEMO_OWNER_UID,
      ),
    ).rejects.toThrow("Firebase Auth UID mismatch");
  });

  it("fails when the owner email is missing in Firebase Auth", async () => {
    getUserByEmail.mockRejectedValue({ code: "auth/user-not-found" });

    await expect(
      verifyGcpImportOwner(
        "rates",
        { projectId: "entitysystem-development" },
        "andreslgomezo@gmail.com",
        RATES_GCP_DEMO_OWNER_UID,
      ),
    ).rejects.toThrow("GCP seed requires Firebase Auth user");
  });
});
