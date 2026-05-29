import { registerEntity } from "@repo/entities";

import { Organization } from "./entities/organization.js";
import { Project } from "./entities/project.js";

registerEntity(Organization);
registerEntity(Project);
