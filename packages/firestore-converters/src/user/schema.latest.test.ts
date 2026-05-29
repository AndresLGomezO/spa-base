import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { UnsupportedSchemaVersionError } from "../core/errors.js";
import { registeredUserConverter } from "./schema.latest.js";

describe("registeredUserConverter", () => {
  it("writes documents as latest schema version", () => {
    const now = new Date().toISOString();
    const persisted = registeredUserConverter.write({
      uid: "user_1",
      email: "demo@example.com",
      emailVerified: true,
      displayName: "Demo User",
      photoURL: null,
      phoneNumber: null,
      disabled: false,
      providers: [],
      authCreatedAt: now,
      authLastSignInAt: now,
      role: "member",
      lastClaimsSyncAt: null,
      createdAt: now,
      updatedAt: now,
      legacyField: "must_be_removed",
    });

    expect(persisted._schemaVersion).toBe(2);
    expect("legacyField" in persisted).toBe(false);
  });

  it("reads an existing latest document", () => {
    const now = new Date().toISOString();
    const domain = registeredUserConverter.read({
      _schemaVersion: 2,
      uid: "user_2",
      email: null,
      emailVerified: false,
      displayName: null,
      photoURL: null,
      phoneNumber: null,
      disabled: false,
      providers: [],
      authCreatedAt: null,
      authLastSignInAt: null,
      role: "admin",
      lastClaimsSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(domain.uid).toBe("user_2");
    expect(domain.role).toBe("admin");
    expect(domain.lastClaimsSyncAt).toBe(now);
  });

  it("migrates v1 documents to v2 with defaults", () => {
    const now = new Date().toISOString();
    const domain = registeredUserConverter.read({
      _schemaVersion: 1,
      uid: "user_3",
      email: "legacy@example.com",
      emailVerified: true,
      displayName: null,
      photoURL: null,
      phoneNumber: null,
      disabled: false,
      providers: [],
      authCreatedAt: null,
      authLastSignInAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(domain.role).toBe("member");
    expect(domain.lastClaimsSyncAt).toBeNull();
  });
});

describe("createVersionedConverter migration behavior", () => {
  const domainSchema = z
    .object({
      id: z.string().min(1),
      flag: z.boolean(),
    })
    .strict();

  const persistedSchema = domainSchema
    .extend({
      _schemaVersion: z.literal(2),
    })
    .strict();

  const converter = createVersionedConverter<
    z.infer<typeof domainSchema>,
    z.infer<typeof persistedSchema>
  >({
    currentVersion: 2,
    domainSchema,
    persistedSchema,
    migrations: {
      1: (legacy) => ({
        ...legacy,
        flag: Boolean(legacy.flag),
        _schemaVersion: 2,
      }),
    },
    fromPersisted: (persisted) => {
      const domain = { ...persisted };
      Reflect.deleteProperty(domain, "_schemaVersion");
      return domain;
    },
    toPersisted: (domain) => domain,
  });

  it("upgrades older version documents during read", () => {
    const domain = converter.read({
      _schemaVersion: 1,
      id: "abc",
      flag: 1,
    });

    expect(domain).toEqual({
      id: "abc",
      flag: true,
    });
  });

  it("fails when reading unsupported future versions", () => {
    expect(() =>
      converter.read({
        _schemaVersion: 3,
        id: "future",
        flag: true,
      }),
    ).toThrow(UnsupportedSchemaVersionError);
  });
});
