import { describe, expect, it } from "vitest";

import { defineEntity } from "../defineEntity.js";
import type { DefinedEntity, FieldDefinitions } from "../types.js";
import {
  applySearchMirrorFields,
  legacySearchMirrorFieldName,
  prepareRecordSearchFields,
  resolveSearchStorageField,
  searchMirrorFieldName,
  tokenizeSearchMirrorValue,
} from "./search-mirror-fields.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const AccountEntity = defineEntity({
  name: "account",
  fields: {
    name: { type: "string", required: true },
    secret: { type: "string", sensitive: true },
  },
  displayField: "name",
  ui: {
    views: [{ type: "table", name: "default", fields: ["name", "secret"] }],
    forms: {
      create: { sections: [{ fields: ["name", "secret"] }] },
      edit: { sections: [{ fields: ["name", "secret"] }] },
    },
    fields: {
      name: { searchable: true },
      secret: { searchable: false },
    },
  },
}) as unknown as AnyDefinedEntity;

describe("searchMirrorFieldName", () => {
  it("appends SearchTokens suffix", () => {
    expect(searchMirrorFieldName("name")).toBe("nameSearchTokens");
  });
});

describe("legacySearchMirrorFieldName", () => {
  it("identifies removed string mirror fields", () => {
    expect(legacySearchMirrorFieldName("name")).toBe("nameSearch");
  });
});

describe("tokenizeSearchMirrorValue", () => {
  it("splits on whitespace and strips punctuation", () => {
    expect(tokenizeSearchMirrorValue("Bancolombia, Ahorros.")).toEqual([
      "bancolombia",
      "ahorros",
    ]);
  });

  it("returns empty array for blank input", () => {
    expect(tokenizeSearchMirrorValue("   ")).toEqual([]);
  });
});

describe("applySearchMirrorFields", () => {
  it("writes token mirror for searchable string fields", () => {
    expect(
      applySearchMirrorFields(AccountEntity, {
        name: "Bancolombia Ahorros",
      }),
    ).toEqual({
      name: "Bancolombia Ahorros",
      nameSearchTokens: ["bancolombia", "ahorros"],
    });
  });

  it("does not mirror sensitive fields", () => {
    expect(
      applySearchMirrorFields(AccountEntity, {
        name: "Primary",
        secret: "Hidden",
      }),
    ).toEqual({
      name: "Primary",
      secret: "Hidden",
      nameSearchTokens: ["primary"],
    });
  });

  it("clears tokens and legacy string mirror when source string is empty", () => {
    expect(
      applySearchMirrorFields(AccountEntity, {
        name: "",
        nameSearch: "stale",
        nameSearchTokens: ["stale"],
      }),
    ).toEqual({
      name: "",
    });
  });

  it("strips legacy string mirror when tokens are written", () => {
    expect(
      applySearchMirrorFields(AccountEntity, {
        name: "Primary",
        nameSearch: "primary",
      }),
    ).toEqual({
      name: "Primary",
      nameSearchTokens: ["primary"],
    });
  });
});

describe("resolveSearchStorageField", () => {
  it("maps logical search field to token mirror field", () => {
    expect(resolveSearchStorageField(AccountEntity)).toBe("nameSearchTokens");
  });
});

describe("prepareRecordSearchFields", () => {
  it("skips token mirrors for in-memory list entities", () => {
    const TagEntity = defineEntity({
      name: "tag",
      fields: { label: { type: "string", required: true } },
      inMemoryListQueries: true,
    }) as unknown as AnyDefinedEntity;

    expect(
      prepareRecordSearchFields(TagEntity, {
        label: "Bancolombia Savings",
        labelSearchTokens: ["stale"],
      }),
    ).toEqual({
      label: "Bancolombia Savings",
    });
  });
});
