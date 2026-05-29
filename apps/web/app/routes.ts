import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  route("login", "./routes/login.tsx"),
  layout("./routes/private-layout.tsx", [
    index("./routes/home.tsx"),
    route("app/:entity/new", "./routes/app/entity-new.tsx"),
    route("app/:entity/:id", "./routes/app/entity-edit.tsx"),
    route("app/:entity", "./routes/app/entity-list.tsx"),
    route("settings/profile", "./routes/settings/profile.tsx"),
    route("settings/team", "./routes/settings/team.tsx"),
    route("settings/billing", "./routes/settings/billing.tsx"),
  ]),
] satisfies RouteConfig;
