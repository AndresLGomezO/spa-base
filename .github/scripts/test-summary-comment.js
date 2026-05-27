/**
 * Post or update the CI test summary and coverage PR comment.
 * Reads inputs from process.env (set by the workflow step) and coverage-reports/ from the runner.
 * Called by actions/github-script with github, context in scope.
 * For workflow_dispatch, set ISSUE_NUMBER to the PR number.
 */
const fs = require('fs');
const path = require('path');

const MARKER = '<!-- ci-test-summary -->';

function readCoverageSummary(workspacePath) {
  const workspace = path.join(process.env.GITHUB_WORKSPACE || '.', 'coverage-reports', workspacePath, 'coverage-summary.json');
  try {
    const raw = fs.readFileSync(workspace, 'utf8');
    const data = JSON.parse(raw);
    const fallback = '—';
    if (data.total) {
      const t = data.total;
      const num = (v) => {
        if (typeof v === 'number' && !Number.isNaN(v)) return v;
        const p = v?.pct;
        return typeof p === 'number' && !Number.isNaN(p) ? p : null;
      };
      return {
        lines: num(t.lines) ?? fallback,
        statements: num(t.statements) ?? fallback,
        branches: num(t.branches) ?? fallback,
        functions: num(t.functions) ?? fallback,
      };
    }
    const keys = Object.keys(data).filter((k) => typeof data[k] === 'object' && data[k] !== null && !Array.isArray(data[k]));
    if (keys.length === 0) return null;
    let totalLines = 0; let coveredLines = 0;
    let totalStatements = 0; let coveredStatements = 0;
    let totalBranches = 0; let coveredBranches = 0;
    let totalFunctions = 0; let coveredFunctions = 0;
    for (const k of keys) {
      const f = data[k];
      if (f.lines) { totalLines += f.lines.total || 0; coveredLines += f.lines.covered || 0; }
      if (f.statements) { totalStatements += f.statements.total || 0; coveredStatements += f.statements.covered || 0; }
      if (f.branches) { totalBranches += f.branches.total || 0; coveredBranches += f.branches.covered || 0; }
      if (f.functions) { totalFunctions += f.functions.total || 0; coveredFunctions += f.functions.covered || 0; }
    }
    const pct = (c, t) => (t > 0 ? Math.round((c / t) * 1000) / 10 : fallback);
    return {
      lines: pct(coveredLines, totalLines),
      statements: pct(coveredStatements, totalStatements),
      branches: pct(coveredBranches, totalBranches),
      functions: pct(coveredFunctions, totalFunctions),
    };
  } catch (_) {
    return null;
  }
}

function badge(label, value, color, opts = '') {
  return `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value)}-${color}?style=flat-square${opts}`;
}

function linkedBadge(label, value, color, url, opts = '') {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${badge(label, value, color, opts)}" alt="${label}" /></a>`;
}

module.exports = async function ({ github, context }) {
  const issueNumber = Number(process.env.ISSUE_NUMBER || context.issue?.number);
  if (!issueNumber) {
    throw new Error(
      'Issue number required: set ISSUE_NUMBER env (e.g. for workflow_dispatch) or run in pull_request context'
    );
  }

  const validateResult = process.env.VALIDATE_RESULT || '—';
  const testOutcome = process.env.TEST_OUTCOME || '—';
  const cypressOutcome = process.env.CYPRESS_OUTCOME || '—';
  const validateRunId = process.env.VALIDATE_RUN_ID || context.runId;
  const workflowUrl = validateRunId
    ? `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${validateRunId}`
    : null;

  const workspaces = ['apps/web'];

  const coverageRows = [];
  for (const ws of workspaces) {
    const name = ws.replace(/^apps\//, '').replace(/^packages\//, '');
    const summary = readCoverageSummary(ws);
    if (!summary) {
      coverageRows.push(`| ${name} | — | — | — | — |`);
      continue;
    }
    const fmt = (v) => (typeof v === 'number' ? `${v}%` : (v != null ? String(v) : '—'));
    coverageRows.push(`| ${name} | ${fmt(summary.lines)} | ${fmt(summary.statements)} | ${fmt(summary.branches)} | ${fmt(summary.functions)} |`);
  }

  const testLabel = testOutcome === 'success' ? 'passed' : testOutcome === 'failure' ? 'failed' : String(testOutcome);
  const cypressLabel = cypressOutcome === 'success' ? 'passed' : cypressOutcome === 'failure' ? 'failed' : String(cypressOutcome);
  const testColor = testOutcome === 'success' ? 'brightgreen' : testOutcome === 'failure' ? 'red' : 'lightgrey';
  const cypressColor = cypressOutcome === 'success' ? 'brightgreen' : cypressOutcome === 'failure' ? 'red' : 'lightgrey';

  let body = `${MARKER}\n\n`;
  body += '## CI test summary\n\n';
  body += '| | Status |\n';
  body += '|---|---|\n';
  body += `| **Vitest** | ${workflowUrl ? linkedBadge('Vitest', testLabel, testColor, workflowUrl) : `\`${testLabel}\``} |\n`;
  body += `| **Cypress** | ${workflowUrl ? linkedBadge('Cypress', cypressLabel, cypressColor, workflowUrl) : `\`${cypressLabel}\``} |\n`;
  if (workflowUrl) {
    body += `| **Workflow** | ${linkedBadge('run', 'View run →', '0969da', workflowUrl, '&logo=githubactions&logoColor=white')} |\n`;
  }
  body += '\n';
  body += '### Coverage (per package/app)\n\n';
  body += '| Package / app | Lines | Statements | Branches | Functions |\n';
  body += '|---|---:|---:|---:|---:|\n';
  body += coverageRows.join('\n');
  body += '\n\n';
  body += `> Validate job: \`${validateResult}\`. Comment updated on each CI run.`;

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

  const matching = allComments.filter((c) => c.body && c.body.includes(MARKER));
  const existing = matching.length ? matching.reduce((a, b) => (a.id > b.id ? a : b)) : null;

  const payload = { owner: context.repo.owner, repo: context.repo.repo, body };
  if (existing) {
    await github.rest.issues.updateComment({ ...payload, comment_id: existing.id });
  } else {
    await github.rest.issues.createComment({ ...payload, issue_number: issueNumber });
  }
};
