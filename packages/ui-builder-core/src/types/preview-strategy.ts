/**
 * Preview strategy: how a builder instance simulates constraints (decoupled from composition scope).
 * @see docs/UI-Builder-unification-master-plan.md §15.4, §15.11
 */

export type PreviewDevice = "mobile" | "tablet" | "desktop";

export type PreviewStrategy =
  | {
      readonly type: "device";
      readonly devices: readonly PreviewDevice[];
    }
  | {
      readonly type: "width";
      readonly min: number;
      readonly max: number;
      readonly default: number;
      readonly presets?: readonly number[];
    }
  | { readonly type: "fixed" };
