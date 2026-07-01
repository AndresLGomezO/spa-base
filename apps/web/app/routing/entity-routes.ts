import { route, type RouteConfigEntry } from "@react-router/dev/routes";

export function buildEntityRouteConfig(): RouteConfigEntry[] {
  return [
    route("app/all-entities/:entity/new", "./routes/app/entity-new.tsx", {
      id: "routes/app/all-entities/entity-new",
    }),
    route("app/all-entities/:entity/:id", "./routes/app/entity-edit.tsx", {
      id: "routes/app/all-entities/entity-edit",
    }),
    route("app/all-entities/:entity", "./routes/app/entity-list.tsx", {
      id: "routes/app/all-entities/entity-list",
    }),
    route("app/:entity/new", "./routes/app/entity-new.tsx"),
    route("app/:entity/:id", "./routes/app/entity-edit.tsx"),
    route("app/:entity", "./routes/app/entity-list.tsx"),
  ];
}
