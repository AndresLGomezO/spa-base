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
    route("select-tenant", "./routes/select-tenant-redirect.tsx"),
    layout("./routes/superadmin-layout.tsx", [
      route("platform/create-tenant", "./routes/platform/create-tenant.tsx"),
      route("settings/tenant", "./routes/settings/tenant.tsx"),
      route("settings/appearance", "./routes/settings/appearance.tsx"),
    ]),
    route("settings/users", "./routes/settings/users.tsx"),
    route("settings/data-models", "./routes/settings/data-models.tsx"),
    route("settings/hooks", "./routes/settings/hooks.tsx"),
    route("settings/metrics", "./routes/settings/metrics.tsx"),
    route(
      "settings/entity-categories",
      "./routes/settings/entity-categories.tsx",
    ),
    route("settings/roles", "./routes/settings/roles.tsx"),
    route("settings/ai-debugger", "./routes/settings/ai-debugger.tsx"),
    route("ai/chat", "./routes/ai/chat.tsx"),
    route(
      "settings/design-layout/list/:entityName",
      "./routes/settings/design-layout/list.tsx",
    ),
    route(
      "settings/design-layout/new-list/:entityName",
      "./routes/settings/design-layout/new-list-redirect.tsx",
    ),
    route(
      "settings/design-layout/main/:entityName",
      "./routes/settings/design-layout/main.tsx",
    ),
    route(
      "settings/design-layout/new-main/:entityName",
      "./routes/settings/design-layout/new-main-redirect.tsx",
    ),
    route(
      "settings/design-layout/detail/:entityName",
      "./routes/settings/design-layout/detail.tsx",
    ),
    route(
      "settings/design-layout/new-detail/:entityName",
      "./routes/settings/design-layout/new-detail-redirect.tsx",
    ),
    route(
      "settings/design-layout/page/:entityName",
      "./routes/settings/design-layout/page.tsx",
    ),
    route(
      "settings/design-layout/forms/:entityName",
      "./routes/settings/design-layout/forms.tsx",
    ),
    route(
      "settings/design-layout/new-forms/:entityName",
      "./routes/settings/design-layout/new-forms.tsx",
    ),
    route(
      "settings/design-layout/metrics/:entityName",
      "./routes/settings/design-layout/metrics-row-designer.tsx",
    ),
    route(
      "settings/design-layout/new-metrics/:entityName",
      "./routes/settings/design-layout/new-metrics-redirect.tsx",
    ),
    route(
      "settings/design-layout/presets",
      "./routes/settings/design-layout/presets.tsx",
    ),
    route(
      "settings/design-layout/dashboard",
      "./routes/settings/design-layout/dashboard.tsx",
    ),
    layout("./routes/tenant-layout.tsx", [
      index("./routes/home.tsx"),
      ...buildEntityRouteConfig(),
    ]),
  ]),
] satisfies RouteConfig;
