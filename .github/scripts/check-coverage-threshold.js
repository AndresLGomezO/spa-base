/**
 * Check that coverage (lines %) per workspace meets the minimum threshold.
 * Reads coverage from workspace coverage/coverage-summary.json (run after pnpm test:coverage).
 * Exits 1 if any workspace with coverage is below the threshold.
 *
 * Env:
 *   MIN_COVERAGE_LINES  Minimum lines coverage % (default: 0, no failure)
 *   GITHUB_WORKSPACE    Repo root (default: .)
 */
const fs = require('fs');
const path = require('path');

const WORKSPACES = ['apps/web'];

function readCoverageSummary(workspacePath) {
  const filePath = path.join(
    process.env.GITHUB_WORKSPACE || '.',
    workspacePath,
    'coverage',
    'coverage-summary.json'
  );
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (data.total) {
      const t = data.total;
      const pct = t.lines?.pct;
      return pct != null ? pct : null;
    }
    const keys = Object.keys(data).filter(
      (k) => typeof data[k] === 'object' && data[k] !== null && !Array.isArray(data[k])
    );
    if (keys.length === 0) return null;
    let totalLines = 0;
    let coveredLines = 0;
    for (const k of keys) {
      const f = data[k];
      if (f.lines) {
        totalLines += f.lines.total || 0;
        coveredLines += f.lines.covered || 0;
      }
    }
    if (totalLines === 0) return null;
    return Math.round((coveredLines / totalLines) * 1000) / 10;
  } catch (_) {
    return null;
  }
}

function main() {
  const minLines = Number(process.env.MIN_COVERAGE_LINES || '0');
  if (!Number.isFinite(minLines) || minLines < 0 || minLines > 100) {
    console.error('MIN_COVERAGE_LINES must be a number between 0 and 100');
    process.exit(1);
  }

  if (minLines === 0) {
    console.log('Coverage threshold: 0% (no minimum enforced).');
    process.exit(0);
  }

  const below = [];
  for (const ws of WORKSPACES) {
    const name = ws.replace(/^apps\//, '').replace(/^packages\//, '');
    const pct = readCoverageSummary(ws);
    if (pct === null) continue;
    if (pct < minLines) {
      below.push({ name, pct });
    }
  }

  if (below.length === 0) {
    console.log(`Coverage threshold: ${minLines}% lines. All workspaces meet the minimum.`);
    process.exit(0);
  }

  console.error(`Coverage threshold: ${minLines}% lines. The following are below minimum:`);
  for (const { name, pct } of below) {
    console.error(`  - ${name}: ${pct}%`);
  }
  console.error(`Set MIN_COVERAGE_LINES in the workflow to change the threshold.`);
  process.exit(1);
}

main();
