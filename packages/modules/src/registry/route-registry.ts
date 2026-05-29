import type { RegisteredRoute } from "../types.js";

const routeRegistry: RegisteredRoute[] = [];

export function registerRoute(route: RegisteredRoute): void {
  routeRegistry.push(route);
}

export function getRegisteredRoutes(): readonly RegisteredRoute[] {
  return routeRegistry;
}

export function clearRouteRegistry(): void {
  routeRegistry.length = 0;
}
