import { loadApp, type AppDefinition } from "@repo/modules";

let bootstrapped = false;

export function bootstrapPlatformApp(app: AppDefinition): void {
  if (bootstrapped) {
    return;
  }
  loadApp(app);
  bootstrapped = true;
}

/** Test helper — reset bootstrap guard between tests. */
export function resetPlatformBootstrapForTests(): void {
  bootstrapped = false;
}
