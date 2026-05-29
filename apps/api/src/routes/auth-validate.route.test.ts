import { describe, expect, it, vi } from "vitest";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import type { CustomerRecord, OrderRecord } from "@repo/shared-types";

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: "user_123",
    email: "demo@example.com",
    role: "admin",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({
    appId: "demo-app-id",
  })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: "user_123",
    email: "demo@example.com",
    emailVerified: true,
    displayName: "Demo User",
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    providerData: [],
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
  })),
  mapFirebaseUserRecordToAuthUserProjection: vi.fn((user) => ({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    disabled: user.disabled,
    providers: [],
    authCreatedAt: user.metadata.creationTime,
    authLastSignInAt: user.metadata.lastSignInTime,
  })),
  createFirestoreAdminRegisteredUserRepository: vi.fn(() => ({
    upsertFromAuthUser: vi.fn(async (authUser) => ({
      uid: authUser.uid,
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
      phoneNumber: authUser.phoneNumber,
      disabled: authUser.disabled,
      providers: authUser.providers,
      authCreatedAt: authUser.authCreatedAt,
      authLastSignInAt: authUser.authLastSignInAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  })),
  createFirestoreAdminEntityRepository: vi.fn(() =>
    createInMemoryEntityRepository(),
  ),
}));

import { buildServer } from "../server.js";

function createInMemoryRepositories() {
  return {
    customer: createInMemoryEntityRepository<CustomerRecord>(),
    order: createInMemoryEntityRepository<OrderRecord>(),
  };
}

async function buildTestServer() {
  return buildServer({
    logger: false,
    repositories: createInMemoryRepositories(),
  });
}

describe("GET /auth/validate", () => {
  it("returns 401 when headers are missing", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().ok).toBe(false);
  });

  it("returns success when headers are present", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      user: { uid: "user_123", email: "demo@example.com" },
      appCheck: { appId: "demo-app-id" },
    });
  });
});
