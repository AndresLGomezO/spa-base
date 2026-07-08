import { describe, expect, it } from "vitest";

import {
  defineEntity,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import {
  enrichFileFieldsForRead,
  fileReferenceMatchesRecordField,
  sanitizeFileFieldsForWrite,
} from "./entity-file-field-utils.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

describe("entity-file-field-utils", () => {
  const entity = defineEntity({
    name: "company",
    fields: {
      logo: { type: "image", required: true },
      brochure: { type: "document" },
      documents: { type: "document", isArray: true },
      name: { type: "string", required: true },
    },
  }) as unknown as AnyDefinedEntity;

  it("strips downloadUrl before write", () => {
    const sanitized = sanitizeFileFieldsForWrite(entity, {
      name: "Acme",
      logo: {
        storagePath: "tenants/t1/entity-files/company/logo-id.png",
        contentType: "image/png",
        fileName: "logo.png",
        downloadUrl: "https://example.com/logo",
      },
      documents: [
        {
          storagePath: "tenants/t1/entity-files/company/doc-id.pdf",
          contentType: "application/pdf",
          fileName: "statement.pdf",
          downloadUrl: "https://example.com/statement",
        },
      ],
    });

    expect(sanitized.logo).toEqual({
      storagePath: "tenants/t1/entity-files/company/logo-id.png",
      contentType: "image/png",
      fileName: "logo.png",
    });
    expect(sanitized.documents).toEqual([
      {
        storagePath: "tenants/t1/entity-files/company/doc-id.pdf",
        contentType: "application/pdf",
        fileName: "statement.pdf",
      },
    ]);
  });

  it("adds downloadUrl on read when storage helper succeeds", async () => {
    const enriched = await enrichFileFieldsForRead(
      {
        projectId: "demo",
        storageEmulatorHost: "127.0.0.1:9199",
        storageBucket: "demo.appspot.com",
      },
      entity,
      {
        name: "Acme",
        logo: {
          storagePath: "tenants/t1/entity-files/company/logo-id.png",
          contentType: "image/png",
          fileName: "logo.png",
        },
      },
    );

    expect(enriched.logo).toMatchObject({
      fileName: "logo.png",
    });
  });

  it("matches file references inside document arrays", () => {
    const record = {
      documents: [
        {
          storagePath: "tenants/t1/entity-files/company/doc-a.pdf",
          contentType: "application/pdf",
          fileName: "a.pdf",
        },
        {
          storagePath: "tenants/t1/entity-files/company/doc-b.pdf",
          contentType: "application/pdf",
          fileName: "b.pdf",
        },
      ],
    };

    expect(
      fileReferenceMatchesRecordField(
        record,
        "documents",
        "tenants/t1/entity-files/company/doc-b.pdf",
      ),
    ).toBe(true);
    expect(
      fileReferenceMatchesRecordField(
        record,
        "documents",
        "tenants/t1/entity-files/company/missing.pdf",
      ),
    ).toBe(false);
  });
});
