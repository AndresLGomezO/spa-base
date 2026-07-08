import { spawnSync, type SpawnSyncReturns } from "node:child_process";

interface GcpCliContext {
  readonly activeAccount: string;
  readonly activeProject: string;
}

export type GcloudRunner = (
  args: readonly string[],
) => SpawnSyncReturns<string>;

function runGcloud(args: readonly string[]): SpawnSyncReturns<string> {
  return spawnSync("gcloud", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readGcloudOutput(result: SpawnSyncReturns<string>): string {
  if (result.error) {
    const reason =
      result.error instanceof Error
        ? result.error.message
        : String(result.error);
    throw new Error(`gcloud command failed: ${reason}`);
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || "unknown error";
    throw new Error(
      `gcloud command failed (exit ${result.status ?? "unknown"}): ${stderr}`,
    );
  }
  return result.stdout.trim();
}

export function assertGcpSeedPreflight(
  expectedProject: string,
  runner: GcloudRunner = runGcloud,
): GcpCliContext {
  const versionResult = runner(["--version"]);
  if (versionResult.error?.message.includes("ENOENT")) {
    throw new Error(
      "gcloud CLI not found on PATH. Install Google Cloud SDK and ensure gcloud is available.",
    );
  }
  readGcloudOutput(versionResult);

  const activeAccount = readGcloudOutput(
    runner([
      "auth",
      "list",
      "--filter=status:ACTIVE",
      "--format=value(account)",
    ]),
  );
  if (!activeAccount) {
    throw new Error("No active gcloud account. Run: gcloud auth login");
  }

  const activeProject = readGcloudOutput(
    runner(["config", "get-value", "project"]),
  );
  if (!activeProject) {
    throw new Error(
      "gcloud project is not set. Run: gcloud config set project <project-id>",
    );
  }
  if (activeProject !== expectedProject) {
    throw new Error(
      `gcloud active project "${activeProject}" does not match --project "${expectedProject}". ` +
        `Run: gcloud config set project ${expectedProject}`,
    );
  }

  const adcResult = runner([
    "auth",
    "application-default",
    "print-access-token",
  ]);
  if (adcResult.status !== 0) {
    const stderr = adcResult.stderr?.trim() || "unknown error";
    throw new Error(
      `Application Default Credentials are not configured (${stderr}). ` +
        "Run: gcloud auth application-default login",
    );
  }

  console.log(`[seed] gcloud account: ${activeAccount}`);
  console.log(`[seed] gcloud project: ${activeProject}`);

  return { activeAccount, activeProject };
}
