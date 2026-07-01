import { route, type RouteConfigEntry } from "@react-router/dev/routes";

export function buildCustomViewRouteConfig(): RouteConfigEntry[] {
  return [route("app/views/:viewId", "./routes/app/views-page.tsx")];
}
