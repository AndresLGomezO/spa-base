import { bootstrapPlatformApp } from "@app/platform/bootstrap";
import { platformApp } from "@app/platform/app.config";

import { registerBuiltInEntityComponents } from "../components/entity/component-registry";

let bootstrapped = false;

export function bootstrapWebPlatform(): void {
  if (bootstrapped) {
    return;
  }
  bootstrapPlatformApp(platformApp);
  registerBuiltInEntityComponents();
  bootstrapped = true;
}
