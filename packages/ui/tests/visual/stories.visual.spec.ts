import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const indexPath = join(packageRoot, "storybook-static/index.json");

type StorybookIndexEntry = {
  id: string;
  title: string;
  name: string;
  type: string;
};

type StorybookIndex = {
  entries: Record<string, StorybookIndexEntry>;
};

function loadStoryEntries(): StorybookIndexEntry[] {
  if (!existsSync(indexPath)) {
    throw new Error(
      `Missing ${indexPath}. Run "pnpm build-storybook" in packages/ui first.`,
    );
  }

  const index = JSON.parse(readFileSync(indexPath, "utf8")) as StorybookIndex;

  return Object.values(index.entries).filter((entry) => entry.type === "story");
}

const storyEntries = loadStoryEntries();

for (const entry of storyEntries) {
  test(`${entry.title} / ${entry.name}`, async ({ page }) => {
    const storyUrl = `/iframe.html?id=${entry.id}&viewMode=story&globals=theme:light`;
    await page.goto(storyUrl, { waitUntil: "domcontentloaded" });

    const root = page.locator("#storybook-root");
    await root.waitFor({ state: "visible" });
    await page
      .waitForLoadState("networkidle", { timeout: 5000 })
      .catch(() => {});

    await expect(root).toHaveScreenshot(`${entry.id}.png`);
  });
}
