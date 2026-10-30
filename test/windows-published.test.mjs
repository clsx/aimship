// This validation branch is intentionally run by the existing Windows workflow.
// Logs carry the report because the workflow does not upload custom artifacts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('Windows official published-package lifecycle', { timeout: 600_000 }, async () => {
  assert.equal(process.platform, 'win32', 'Run this validation branch with Check Windows.');
  assert.ok(process.env.npm_execpath, 'Run through the existing npm test workflow.');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-windows-published-'));
  try {
    const output = path.join(temporary, 'evidence');
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/check-windows-lifecycle.mjs'), output, process.env.npm_execpath], { cwd: root, encoding: 'utf8', timeout: 570_000, maxBuffer: 16 * 1024 * 1024 });
    console.log(result.stdout); console.log(result.stderr);
    const report = await fs.readFile(path.join(output, 'report.json'), 'utf8');
    console.log('WINDOWS_LIFECYCLE_REPORT_JSON ' + JSON.stringify(JSON.parse(report)));
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

test('Windows complete synthetic delivery examples', { timeout: 180_000 }, async () => {
  assert.equal(process.platform, 'win32', 'Run this validation branch with Check Windows.');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'aimship-windows-examples-'));
  try {
    const output = path.join(temporary, 'examples');
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/run-examples.mjs'), output], { cwd: root, encoding: 'utf8', timeout: 150_000, maxBuffer: 8 * 1024 * 1024 });
    console.log(result.stdout); console.log(result.stderr);
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
    console.log('WINDOWS_EXAMPLES_REPORT_JSON ' + JSON.stringify(JSON.parse(await fs.readFile(path.join(output, 'summary.json'), 'utf8'))));
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});
