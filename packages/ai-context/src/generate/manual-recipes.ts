import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface ManualRecipeFrontmatter {
  readonly aiContextFragmentId: string;
  readonly title?: string;
  readonly surfaces?: readonly string[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseYamlList(value: string): readonly string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return [trimmed.replace(/^['"]|['"]$/g, "")];
}

function parseFrontmatter(raw: string): ManualRecipeFrontmatter | null {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    return null;
  }

  const yaml = match[1];
  const body = match[2]?.trim() ?? "";
  if (!yaml) {
    return null;
  }

  let aiContextFragmentId = "";
  let title: string | undefined;
  let surfaces: readonly string[] | undefined;

  for (const line of yaml.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key === "aiContextFragmentId") {
      aiContextFragmentId = value.replace(/^['"]|['"]$/g, "");
    } else if (key === "title") {
      title = value.replace(/^['"]|['"]$/g, "");
    } else if (key === "surfaces") {
      surfaces = parseYamlList(value);
    }
  }

  if (!aiContextFragmentId) {
    return null;
  }

  const header = title ? `# ${title}\n\n` : "";
  return {
    aiContextFragmentId,
    title,
    surfaces,
    body: `${header}${body}`,
  } as ManualRecipeFrontmatter & { readonly body: string };
}

export function buildManualRecipeFragments(
  recipesDir: string,
): Record<string, string> {
  const fragments: Record<string, string> = {};

  let entries: string[];
  try {
    entries = readdirSync(recipesDir).filter((name) => name.endsWith(".md"));
  } catch {
    return fragments;
  }

  for (const fileName of entries) {
    const raw = readFileSync(join(recipesDir, fileName), "utf8");
    const parsed = parseFrontmatter(raw) as
      | (ManualRecipeFrontmatter & { readonly body: string })
      | null;
    if (!parsed) {
      continue;
    }

    const surfaceNote =
      parsed.surfaces && parsed.surfaces.length > 0
        ? `\n\n**Surfaces:** ${parsed.surfaces.map((s) => `\`${s}\``).join(", ")}`
        : "";

    fragments[parsed.aiContextFragmentId] = `${parsed.body}${surfaceNote}`;
  }

  return fragments;
}
