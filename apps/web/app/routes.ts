import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

import { buildEntityRouteConfig } from "./routing/entity-routes";
import { buildCustomViewRouteConfig } from "./routing/custom-view-routes";

export default [
  route("login", "./routes/login.tsx"),
  layout("./routes/private-layout.tsx", [
    route("select-tenant", "./routes/select-tenant-redirect.tsx"),
    layout("./routes/superadmin-layout.tsx", [
      route("platform/create-tenant", "./routes/platform/create-tenant.tsx"),
      route("platform/workloads", "./routes/platform/workloads.tsx"),
      route("settings/tenant", "./routes/settings/tenant.tsx"),
      route("settings/appearance", "./routes/settings/appearance.tsx"),
      route("settings/observability", "./routes/settings/observability.tsx"),
    ]),
    route("settings/users", "./routes/settings/users.tsx"),
    route("settings/data-models", "./routes/settings/data-models.tsx"),
    route("settings/automation", "./routes/settings/automation.tsx"),
    route("settings/ai-context", "./routes/settings/ai-context-layout.tsx", [
      index("./routes/settings/ai-context-index.tsx"),
      route("sections", "./routes/settings/ai-context-sections.tsx"),
      route(
        "record-summaries",
        "./routes/settings/ai-context-record-summaries.tsx",
      ),
    ]),
    route(
      "settings/user-ai-context",
      "./routes/settings/user-ai-context-redirect.tsx",
    ),
    route("settings/email", "./routes/settings/email.tsx"),
    route("account/settings", "./routes/account/settings-layout.tsx", [
      index("./routes/account/settings-index.tsx"),
      route("general", "./routes/account/general.tsx"),
      route("profile", "./routes/account/profile.tsx"),
      route("tenants", "./routes/account/tenants.tsx"),
      route("notifications", "./routes/account/notifications.tsx"),
      route("integrations/email", "./routes/account/integrations-email.tsx"),
    ]),
    route("settings/metrics", "./routes/settings/metrics.tsx"),
    route("settings/charts", "./routes/settings/charts.tsx"),
    route("settings/formulas", "./routes/settings/formulas.tsx"),
    route("settings/translations", "./routes/settings/translations.tsx"),
    route("settings/email-matching", "./routes/settings/email-matching.tsx"),
    route("settings/query-builder", "./routes/settings/query-builder.tsx"),
    route("settings/custom-views", "./routes/settings/custom-views.tsx"),
    route(
      "settings/entity-categories",
      "./routes/settings/entity-categories.tsx",
    ),
    route("settings/roles", "./routes/settings/roles.tsx"),
    route("settings/ai-debugger", "./routes/settings/ai-debugger-redirect.tsx"),
    route("debugger", "./routes/debugger-index-redirect.tsx"),
    route("notifications", "./routes/notifications.tsx"),
    route("debugger/:sourceSlug", "./routes/debugger.tsx"),
    route("ai/chat", "./routes/ai/chat.tsx"),
    route("ai/insights", "./routes/ai/insights.tsx"),
    route(
      "settings/design-layout/main/custom-view/:viewId",
      "./routes/settings/design-layout/main-custom-view.tsx",
    ),
    route(
      "settings/design-layout/list/custom-view/:viewId",
      "./routes/settings/design-layout/list-custom-view.tsx",
    ),
    route(
      "settings/design-layout/metrics/custom-view/:viewId",
      "./routes/settings/design-layout/metrics-custom-view.tsx",
    ),
    route(
      "settings/design-layout/forms/:entityName/:formDesignId",
      "./routes/settings/design-layout/legacy-forms-redirect.tsx",
    ),
    route(
      "settings/design-layout/forms/:formDesignId",
      "./routes/settings/design-layout/form-design.tsx",
    ),
    route(
      "settings/design-layout/list/:entityName",
      "./routes/settings/design-layout/legacy-list-entity.tsx",
    ),
    route(
      "settings/design-layout/list",
      "./routes/settings/design-layout/list.tsx",
    ),
    route(
      "settings/design-layout/new-list/:entityName",
      "./routes/settings/design-layout/new-list-redirect.tsx",
    ),
    route(
      "settings/design-layout/main/:entityName",
      "./routes/settings/design-layout/legacy-main-entity.tsx",
    ),
    route(
      "settings/design-layout/main",
      "./routes/settings/design-layout/main.tsx",
    ),
    route(
      "settings/design-layout/new-main/:entityName",
      "./routes/settings/design-layout/new-main-redirect.tsx",
    ),
    route(
      "settings/design-layout/detail/:entityName",
      "./routes/settings/design-layout/legacy-detail-entity.tsx",
    ),
    route(
      "settings/design-layout/detail",
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
      "settings/design-layout/forms",
      "./routes/settings/design-layout/forms.tsx",
    ),
    route(
      "settings/design-layout/new-forms/:entityName",
      "./routes/settings/design-layout/new-forms.tsx",
    ),
    route(
      "settings/design-layout/metrics/:entityName",
      "./routes/settings/design-layout/legacy-metrics-entity.tsx",
    ),
    route(
      "settings/design-layout/metrics",
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
    route(
      "settings/design-layout/app-shell",
      "./routes/settings/design-layout/app-shell.tsx",
    ),
    route(
      "settings/design-layout/sidebar",
      "./routes/settings/design-layout/sidebar-redirect.tsx",
    ),
    layout("./routes/tenant-layout.tsx", [
      index("./routes/home.tsx"),
      route("search", "./routes/search.tsx"),
      ...buildEntityRouteConfig(),
      ...buildCustomViewRouteConfig(),
    ]),
  ]),
] satisfies RouteConfig;
