declare module "culori" {
  export type Oklch = {
    mode: "oklch";
    l: number;
    c: number;
    h: number;
  };

  export function parse(color: string): unknown;
  export function formatHex(color: unknown): string | undefined;
  export function converter(
    mode: "oklch",
  ): (color: unknown) => Oklch | undefined;
}
