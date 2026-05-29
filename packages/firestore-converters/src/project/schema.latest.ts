import {
  PROJECT_SCHEMA_VERSION,
  persistedProjectSchemaV1,
  projectSchema,
  type PersistedProject,
  type ProjectRecord,
} from "@repo/shared-types";
import type { z } from "zod";

import { createVersionedConverter } from "../core/versioned-converter.js";
import { projectMigrations } from "./transforms/index.js";

export const projectCurrentVersion = PROJECT_SCHEMA_VERSION;

export const projectConverter = createVersionedConverter<
  ProjectRecord,
  PersistedProject
>({
  currentVersion: projectCurrentVersion,
  domainSchema: projectSchema,
  persistedSchema:
    persistedProjectSchemaV1 as unknown as z.ZodType<PersistedProject>,
  migrations: projectMigrations,
  fromPersisted: (persisted) => {
    const domain = { ...persisted };
    Reflect.deleteProperty(domain, "_schemaVersion");
    return domain;
  },
  toPersisted: (domain) => domain,
});
