export interface SeedDatabaseCliOptions {
  readonly gcp: boolean;
  readonly projectId?: string;
}

function normalizeArgv(argv: readonly string[]): string[] {
  return argv.filter((arg) => arg !== "--");
}

function readFlagValue(
  argv: readonly string[],
  index: number,
  flag: string,
): string {
  const value = argv[index + 1]?.trim();
  if (!value) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

export function parseSeedDatabaseArgs(
  argv: readonly string[],
): SeedDatabaseCliOptions {
  const normalizedArgv = normalizeArgv(argv);
  let gcp = false;
  let projectId: string | undefined;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index]!;
    if (arg === "--gcp") {
      gcp = true;
      continue;
    }
    if (arg === "--project") {
      projectId = readFlagValue(normalizedArgv, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--project=")) {
      projectId = arg.slice("--project=".length).trim();
      if (!projectId) {
        throw new Error("Missing value for --project.");
      }
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (gcp && !projectId) {
    throw new Error("--project is required when using --gcp.");
  }

  return { gcp, projectId };
}
