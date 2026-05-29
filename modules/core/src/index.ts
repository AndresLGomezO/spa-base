import { defineModule, type ModuleDefinition } from "@repo/modules";
import {
  organizationConverter,
  projectConverter,
} from "@repo/firestore-converters";

import { Organization } from "./entities/organization.js";
import { Project } from "./entities/project.js";

export const coreModule = defineModule({
  name: "core",
  version: "1.0.0",
  entities: [Organization, Project] as unknown as NonNullable<
    ModuleDefinition["entities"]
  >,
  converters: {
    organization: organizationConverter,
    project: projectConverter,
  },
});

export { Organization } from "./entities/organization.js";
export { Project } from "./entities/project.js";
