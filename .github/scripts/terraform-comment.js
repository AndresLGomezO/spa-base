/**
 * Post or update the Terraform plan PR comment.
 * Reads plan from PLAN_PATH (or default under GITHUB_WORKSPACE).
 * Expects: github, context from github-script; WORKSPACE, ISSUE_NUMBER from env.
 */
const fs = require("fs");
const path = require("path");

const MARKER = "<!-- terraform-verify -->";
const MAX_ITEMS = 25;

function parsePlan(raw) {
  const noChanges = raw.includes(
    "No changes. Your infrastructure matches the configuration",
  );
  if (noChanges) {
    return {
      summary:
        "**Plan:** No changes. Infrastructure matches the configuration.",
      toAdd: [],
      toChange: [],
      toDestroy: [],
    };
  }
  const planMatch = raw.match(
    /Plan:\s*(\d+)\s+to\s+add,\s*(\d+)\s+to\s+change,\s*(\d+)\s+to\s+destroy/,
  );
  if (!planMatch) {
    return {
      summary: "**Plan:** (summary could not be parsed)",
      toAdd: [],
      toChange: [],
      toDestroy: [],
    };
  }
  const [, add, change, destroy] = planMatch.map(Number);
  const summary = `**Plan:** ${add} to add, ${change} to change, ${destroy} to destroy.`;
  const toAdd = [...raw.matchAll(/#\s+([^\s]+)\s+will be created/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
  const toChange = [
    ...raw.matchAll(/#\s+([^\s]+)\s+will be updated in-place/g),
  ]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
  const toDestroy = [...raw.matchAll(/#\s+([^\s]+)\s+will be destroyed/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
  return { summary, toAdd, toChange, toDestroy };
}

function section(title, items) {
  if (items.length === 0) return "";
  const lines = items
    .slice(0, MAX_ITEMS)
    .map((r) => `- \`${r}\``)
    .join("\n");
  const more =
    items.length > MAX_ITEMS
      ? `\n_... and ${items.length - MAX_ITEMS} more_`
      : "";
  return `**${title}**\n${lines}${more}\n\n`;
}

module.exports = async function ({ github, context }) {
  const workspace = process.env.WORKSPACE || "dev";
  const issueNumber = Number(
    process.env.ISSUE_NUMBER || context.issue?.number,
  );
  const baseRef = context.payload.pull_request?.base?.ref || "—";

  const planPath =
    process.env.PLAN_PATH ||
    path.join(
      process.env.GITHUB_WORKSPACE || ".",
      "packages/infrastructure/terraform/plan_output.txt",
    );
  let parsed = {
    summary: "**Plan:** (plan output not available)",
    toAdd: [],
    toChange: [],
    toDestroy: [],
  };
  try {
    const raw = fs.readFileSync(planPath, "utf8");
    parsed = parsePlan(raw);
  } catch (_) {
    // use default
  }

  let body = `${MARKER}\n\n`;
  body += "## Terraform verification\n\n";
  body += "✅ **Validation:** format check, validate, and plan completed.\n\n";
  body += "| | |\n";
  body += "|---|---|\n";
  body += `| **Workspace** | \`${workspace}\` |\n`;
  body += `| **Target branch** | \`${baseRef}\` |\n`;
  body += `| **Summary** | ${parsed.summary} |\n\n`;

  if (parsed.toAdd.length || parsed.toChange.length || parsed.toDestroy.length) {
    body += "### Resource changes\n\n";
    body += section("To add", parsed.toAdd);
    body += section("To update", parsed.toChange);
    body += section("To remove", parsed.toDestroy);
  }
  body +=
    "> This is a validation-only run. Terraform is applied when this PR is merged (or via manual deploy).";

  const allComments = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data: comments } = await github.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      per_page: perPage,
      page,
    });
    allComments.push(...comments);
    if (comments.length < perPage) break;
    page += 1;
  }

  const existing = allComments.find(
    (c) => c.body && c.body.includes(MARKER),
  );

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body,
    });
  }
};
