export const COLOR_SCALE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

export type ColorScaleStep = (typeof COLOR_SCALE_STEPS)[number];

export function isColorScaleStep(value: string): value is ColorScaleStep {
  return (COLOR_SCALE_STEPS as readonly string[]).includes(value);
}
