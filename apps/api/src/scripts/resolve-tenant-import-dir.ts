import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function resolveRepoRoot(startDir: string = process.cwd()): string {
  let current = startDir;
  for (;;) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

export function resolveTenantImportDir(
  startDir: string = process.cwd(),
): string {
  const fromEnv = process.env.TENANT_IMPORT_DIR?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return join(resolveRepoRoot(startDir), ".local/tenant-import");
}
