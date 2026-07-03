export const FORMULA_PERMISSIONS = [
  "formula.read",
  "formula.create",
  "formula.update",
  "formula.delete",
] as const;

export type FormulaPermission = (typeof FORMULA_PERMISSIONS)[number];
