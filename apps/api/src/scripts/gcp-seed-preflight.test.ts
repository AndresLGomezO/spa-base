import type { SpawnSyncReturns } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  assertGcpSeedPreflight,
  type GcloudRunner,
} from "./gcp-seed-preflight.js";

function mockRunner(
  responses: Record<
    string,
    Partial<SpawnSyncReturns<string>> & { error?: Error }
  >,
): GcloudRunner {
  return (args) => {
    const key = args.join(" ");
    const response = responses[key];
    if (!response) {
      throw new Error(`Unexpected gcloud args: ${key}`);
    }
    return {
      stdout: response.stdout ?? "",
      stderr: response.stderr ?? "",
      status: response.status ?? 0,
      output: [null, response.stdout ?? "", response.stderr ?? ""],
      signal: null,
      pid: 0,
      error: response.error,
    };
  };
}

describe("assertGcpSeedPreflight", () => {
  it("passes when account, project, and ADC are valid", () => {
    const context = assertGcpSeedPreflight(
      "entitysystem-development",
      mockRunner({
        "--version": { stdout: "Google Cloud SDK 500.0.0\n" },
        "auth list --filter=status:ACTIVE --format=value(account)": {
          stdout: "entitysystemproject@gmail.com\n",
        },
        "config get-value project": {
          stdout: "entitysystem-development\n",
        },
        "auth application-default print-access-token": {
          stdout: "ya29.mock-token\n",
        },
      }),
    );

    expect(context).toEqual({
      activeAccount: "entitysystemproject@gmail.com",
      activeProject: "entitysystem-development",
    });
  });

  it("fails when active project does not match --project", () => {
    expect(() =>
      assertGcpSeedPreflight(
        "entitysystem-development",
        mockRunner({
          "--version": { stdout: "Google Cloud SDK 500.0.0\n" },
          "auth list --filter=status:ACTIVE --format=value(account)": {
            stdout: "entitysystemproject@gmail.com\n",
          },
          "config get-value project": { stdout: "other-project\n" },
        }),
      ),
    ).toThrow(
      'gcloud active project "other-project" does not match --project "entitysystem-development"',
    );
  });

  it("fails when no active gcloud account is configured", () => {
    expect(() =>
      assertGcpSeedPreflight(
        "entitysystem-development",
        mockRunner({
          "--version": { stdout: "Google Cloud SDK 500.0.0\n" },
          "auth list --filter=status:ACTIVE --format=value(account)": {
            stdout: "",
          },
        }),
      ),
    ).toThrow("No active gcloud account");
  });

  it("fails when application default credentials are missing", () => {
    expect(() =>
      assertGcpSeedPreflight(
        "entitysystem-development",
        mockRunner({
          "--version": { stdout: "Google Cloud SDK 500.0.0\n" },
          "auth list --filter=status:ACTIVE --format=value(account)": {
            stdout: "entitysystemproject@gmail.com\n",
          },
          "config get-value project": {
            stdout: "entitysystem-development\n",
          },
          "auth application-default print-access-token": {
            status: 1,
            stderr: "Reauthentication required.",
          },
        }),
      ),
    ).toThrow("Application Default Credentials are not configured");
  });
});
