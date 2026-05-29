import { defineApp } from "@repo/modules";
import { coreModule } from "@modules/core";
import { inventoryModule } from "@modules/inventory";

export const platformApp = defineApp({
  modules: [coreModule, inventoryModule],
});
