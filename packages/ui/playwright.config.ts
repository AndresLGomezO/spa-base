import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const packageRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests/visual",
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: true,
  // Headless Chromium can SIGSEGV when many browsers launch at once in Docker/CI.
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      // Allow minor cross-OS font/antialiasing drift (macOS vs Linux CI).
      maxDiffPixelRatio: 0.04,
    },
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:6007",
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec serve storybook-static -l 6007 --no-request-logging -c ${join(packageRoot, "serve.json")}`,
    url: "http://127.0.0.1:6007",
    reuseExistingServer: !process.env.CI,
    cwd: packageRoot,
  },
});
