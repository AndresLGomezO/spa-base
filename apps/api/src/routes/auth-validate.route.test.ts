import { beforeEach, describe, expect, it, vi } from "vitest";

const syncUserRoleClaimsMock = vi.hoisted(() =>
  vi.fn(async (user: { uid: string; role: string }) => ({
    ...user,
    lastClaimsSyncAt: new Date().toISOString(),
  })),
);

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: "user_123",
    email: "demo@example.com",
    role: "member",
    auth_time: 1704067200,
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
    getByUid: vi.fn(async () => null),
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
      role: "member",
      lastClaimsSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    updateRole: vi.fn(),
    markClaimsSynced: vi.fn(),
  })),
  setFirebaseUserCustomClaims: vi.fn(),
}));

vi.mock("../services/role-claims-sync.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../services/role-claims-sync.service.js")
  >("../services/role-claims-sync.service.js");

  return {
    ...actual,
    syncUserRoleClaims: syncUserRoleClaimsMock,
    shouldSyncRoleClaims: vi.fn(() => true),
  };
});

import { buildServer } from "../server.js";

describe("GET /auth/validate", () => {
  beforeEach(() => {
    syncUserRoleClaimsMock.mockClear();
  });

  it("returns 401 when headers are missing", async () => {
    const server = await buildServer({ logger: false });
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().ok).toBe(false);
  });

  it("returns success when headers are present", async () => {
    const server = await buildServer({ logger: false });
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
      user: { uid: "user_123", email: "demo@example.com", role: "member" },
      appCheck: { appId: "demo-app-id" },
    });
    expect(syncUserRoleClaimsMock).toHaveBeenCalled();
  });
});
