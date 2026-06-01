import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

import { buildEntityRouteConfig } from "./routing/entity-routes";

export default [
  route("login", "./routes/login.tsx"),
  layout("./routes/private-layout.tsx", [
    route("select-tenant", "./routes/select-tenant.tsx"),
    layout("./routes/superadmin-layout.tsx", [
      route("platform/create-tenant", "./routes/platform/create-tenant.tsx"),
      route("settings/tenant", "./routes/settings/tenant.tsx"),
      route("settings/appearance", "./routes/settings/appearance.tsx"),
    ]),
    route("settings/users", "./routes/settings/users.tsx"),
    route("settings/data-models", "./routes/settings/data-models.tsx"),
    route("settings/hooks", "./routes/settings/hooks.tsx"),
    route(
      "settings/entity-categories",
      "./routes/settings/entity-categories.tsx",
    ),
    route("settings/roles", "./routes/settings/roles.tsx"),
    layout("./routes/tenant-layout.tsx", [
      index("./routes/home.tsx"),
      ...buildEntityRouteConfig(),
    ]),
  ]),
] satisfies RouteConfig;
