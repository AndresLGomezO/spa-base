import { registerComponent } from "@repo/ui-builder";

import { BadgeField } from "./custom-fields/BadgeField";
import { DocumentField } from "./custom-fields/DocumentField";
import { ImageField } from "./custom-fields/ImageField";
import { registerFieldComponent } from "./field-component-registry";
import { registerViewComponent } from "./view-component-registry";
import { EntityLayoutCardView } from "./EntityLayoutCardView";
import { EntityTable } from "./EntityTable";

export function registerBuiltInEntityComponents(): void {
  registerComponent("input", "input");
  registerComponent("number", "number");
  registerComponent("toggle", "toggle");
  registerComponent("date", "date");
  registerComponent("relation", "relation");
  registerComponent("image", "ImageField");
  registerComponent("document", "DocumentField");
  registerComponent("badge", "BadgeField");

  registerFieldComponent("BadgeField", BadgeField);
  registerFieldComponent("ImageField", ImageField);
  registerFieldComponent("DocumentField", DocumentField);

  registerViewComponent("table", EntityTable);
  registerViewComponent("card", EntityLayoutCardView);
}
