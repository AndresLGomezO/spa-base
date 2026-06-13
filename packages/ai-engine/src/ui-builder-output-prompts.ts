export function appendSurfaceOutputInstruction(
  systemInstruction: string,
  surface: string,
): string {
  if (surface === "list") {
    return systemInstruction;
  }
  return systemInstruction;
}
