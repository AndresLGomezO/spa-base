export async function loadFormulaAdmin(): Promise<
  typeof import("./formula-admin-entry.js")
> {
  if (process.env.VITEST === "true" || process.env.NODE_ENV !== "production") {
    return import("./formula-admin-entry.js");
  }
  // @ts-expect-error Production bundle chunk emitted by esbuild as dist/formula-admin.js.
  return import("./formula-admin.js") as Promise<
    typeof import("./formula-admin-entry.js")
  >;
}
