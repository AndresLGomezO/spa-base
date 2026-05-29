import { registerComponent } from "@repo/ui-builder";

import { BadgeField } from "./custom-fields/BadgeField";
import { registerFieldComponent } from "./field-component-registry";
import { registerViewComponent } from "./view-component-registry";
import { EntityCardView } from "./EntityCardView";
import { EntityTable } from "./EntityTable";

export function registerBuiltInEntityComponents(): void {
  registerComponent("input", "input");
  registerComponent("number", "number");
  registerComponent("toggle", "toggle");
  registerComponent("date", "date");
  registerComponent("relation", "relation");
  registerComponent("badge", "BadgeField");

  registerFieldComponent("BadgeField", BadgeField);

  registerViewComponent("table", EntityTable);
  registerViewComponent("card", EntityCardView);
}
