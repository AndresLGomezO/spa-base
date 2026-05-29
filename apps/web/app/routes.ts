import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

import { buildEntityRouteConfig } from "./routing/entity-routes";

export default [
  route("login", "./routes/login.tsx"),
  layout("./routes/auth-only-layout.tsx", [
    route("select-tenant", "./routes/select-tenant.tsx"),
    route("settings/admin", "./routes/settings/admin.tsx"),
    route(
      "settings/admin/data-models",
      "./routes/settings/admin-data-models.tsx",
    ),
    route("settings/admin/roles", "./routes/settings/admin-roles.tsx"),
  ]),
  layout("./routes/private-layout.tsx", [
    index("./routes/home.tsx"),
    ...buildEntityRouteConfig(),
    route("settings/profile", "./routes/settings/profile.tsx"),
    route("settings/team", "./routes/settings/team.tsx"),
    route("settings/billing", "./routes/settings/billing.tsx"),
    route("settings/data-models", "./routes/settings/data-models.tsx"),
    route("settings/roles", "./routes/settings/roles.tsx"),
  ]),
] satisfies RouteConfig;
