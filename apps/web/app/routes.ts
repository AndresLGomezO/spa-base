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
  ]),
  layout("./routes/private-layout.tsx", [
    index("./routes/home.tsx"),
    ...buildEntityRouteConfig(),
    route("settings/profile", "./routes/settings/profile.tsx"),
    route("settings/team", "./routes/settings/team.tsx"),
    route("settings/billing", "./routes/settings/billing.tsx"),
    route("settings/admin", "./routes/settings/admin.tsx"),
  ]),
] satisfies RouteConfig;
