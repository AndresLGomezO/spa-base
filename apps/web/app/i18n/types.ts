/**
 * Type-safe t() via i18next module augmentation.
 * En keys are the source of truth for resource shape.
 */

import type enCommon from "./locales/en/common.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof enCommon;
    };
  }
}
