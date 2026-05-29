import { route, type RouteConfigEntry } from "@react-router/dev/routes";

export function buildEntityRouteConfig(): RouteConfigEntry[] {
  return [
    route("app/:entity/new", "./routes/app/entity-new.tsx"),
    route("app/:entity/:id", "./routes/app/entity-edit.tsx"),
    route("app/:entity", "./routes/app/entity-list.tsx"),
  ];
}
