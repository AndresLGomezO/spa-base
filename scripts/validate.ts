/**
 * Runs the monorepo validation pipeline.
 *
 * Usage:
 *   pnpm run validate
 *   pnpm run validate -- --quiet
 *   pnpm run validate -- -q
 *   pnpm run validate:ci
 *   pnpm run validate:ci -- --quiet
 */

import { spawn } from "node:child_process";

interface ValidateStep {
  label: string;
  command: string;
  env?: NodeJS.ProcessEnv;
}

const QUIET = process.argv.includes("--quiet") || process.argv.includes("-q");
const CI = process.argv.includes("--ci");

const VALIDATE_STEPS: ValidateStep[] = [
  {
    label: "Build, lint, typecheck, test, format check, cypress",
    command:
      "turbo run build typecheck test format:check cypress && turbo run lint -- --max-warnings 0",
  },
  {
    label: "Storybook build (@repo/ui)",
    command: "pnpm run build-storybook",
  },
  {
    label: "Static analysis (unused + circular)",
    command: "pnpm run lint:static",
  },
  {
    label: "i18n locale key parity",
    command: "pnpm run i18n:validate -- --strict",
  },
  {
    label: "Duplicate detection",
    command: "pnpm run lint:duplicates",
  },
  {
    label: "Dependency catalog alignment",
    command: "pnpm run lint:deps",
  },
];

const VALIDATE_CI_STEPS: ValidateStep[] = [
  {
    label: "Build, lint, typecheck, test:coverage, format check, cypress",
    command:
      "turbo run build typecheck test:coverage format:check cypress && turbo run lint -- --max-warnings 0",
    env: { CI: "true" },
  },
  {
    label: "Unused code",
    command: "pnpm run lint:unused",
    env: { CI: "true" },
  },
  {
    label: "Circular dependencies",
    command: "pnpm run lint:circular",
    env: { CI: "true" },
  },
  {
    label: "i18n locale key parity",
    command: "pnpm run i18n:validate -- --strict",
  },
  {
    label: "Duplicate detection",
    command: "pnpm run lint:duplicates",
  },
  {
    label: "Dependency catalog alignment",
    command: "pnpm run lint:deps",
  },
  {
    label: "Docker workspace COPY alignment",
    command: "pnpm run check:docker-workspace",
  },
];

function runStep(step: ValidateStep): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];

    const child = spawn(step.command, {
      cwd: process.cwd(),
      env: { ...process.env, ...step.env },
      shell: true,
      stdio: QUIET ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    if (QUIET) {
      child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
      child.stderr?.on("data", (chunk: Buffer) => chunks.push(chunk));
    }

    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        output: Buffer.concat(chunks).toString("utf8"),
      });
    });
  });
}

function printStepStatus(label: string, ok: boolean) {
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${label}`);
}

async function main() {
  const steps = CI ? VALIDATE_CI_STEPS : VALIDATE_STEPS;
  const mode = CI ? "validate:ci" : "validate";

  if (QUIET) {
    console.log(`Running ${mode} (${steps.length} steps)...\n`);
  } else {
    console.log(`Running ${mode}...\n`);
  }

  for (const step of steps) {
    if (QUIET) {
      process.stdout.write(`→ ${step.label}\n`);
    }

    const result = await runStep(step);

    if (QUIET) {
      process.stdout.write("\x1b[1A\x1b[2K");
      printStepStatus(step.label, result.ok);

      if (!result.ok) {
        if (result.output.trim()) {
          console.error("\n--- output ---\n");
          console.error(result.output.trimEnd());
          console.error("\n--------------\n");
        }

        console.error(`Validation failed at: ${step.label}`);
        process.exit(1);
      }

      continue;
    }

    if (!result.ok) {
      console.error(`\nValidation failed at: ${step.label}`);
      process.exit(1);
    }
  }

  if (QUIET) {
    console.log(`\nValidation passed (${steps.length}/${steps.length} steps).`);
  } else {
    console.log("\nValidation passed.");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
