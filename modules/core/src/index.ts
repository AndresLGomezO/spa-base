import { defineModule, type ModuleDefinition } from "@repo/modules";
import {
  customerConverter,
  organizationConverter,
  projectConverter,
} from "@repo/firestore-converters";

import { Customer } from "./entities/customer.js";
import { Organization } from "./entities/organization.js";
import { Project } from "./entities/project.js";

export const coreModule = defineModule({
  name: "core",
  version: "1.0.0",
  entities: [Customer, Organization, Project] as unknown as NonNullable<
    ModuleDefinition["entities"]
  >,
  converters: {
    customer: customerConverter,
    organization: organizationConverter,
    project: projectConverter,
  },
});

export { Customer } from "./entities/customer.js";
export { Organization } from "./entities/organization.js";
export { Project } from "./entities/project.js";
