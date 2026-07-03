/**
 * Platform formula names for browser-safe catalog validation.
 * Keep in sync with platform-formulas.json (see platform-formula-names.test.ts).
 * Math-only — domain formulas live in tenant catalogs.
 */
export const PLATFORM_FORMULA_NAMES = [
  "annuityPayment",
  "simpleInterest",
] as const;

export function getPlatformFormulaNames(): readonly string[] {
  return PLATFORM_FORMULA_NAMES;
}
