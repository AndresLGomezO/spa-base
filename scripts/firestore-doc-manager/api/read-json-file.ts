import { readFileSync } from "node:fs";

export function readJsonFile(filePath: string): unknown {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}
