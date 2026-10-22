import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { releaseFiles } from '../lib/install.mjs';
import { STAGES } from '../lib/state.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
try {
  const { pkg, files } = await releaseFiles(root);
  if (pkg.license !== 'MIT' || !files.LICENSE) throw new Error('MIT license metadata and file are required.');
  for (const stage of STAGES) if (!files[`skills/aimship/references/stages/${stage}.md`]) throw new Error(`Missing stage: ${stage}`);
  for (const required of ['README.md', 'README.zh-CN.md', 'LICENSE', 'skills/aimship/agents/openai.yaml']) if (!files[required]) throw new Error(`Missing public file: ${required}`);
  for (const file of Object.keys(files)) {
    if (/(^|[/\\])(planning|validation|\.git|\.env|node_modules)([/\\]|$)/.test(file)) throw new Error(`Private or unexpected package path: ${file}`);
    const content = await fs.readFile(path.join(root, file), 'utf8');
    if (/\/Users\/[A-Za-z0-9_.-]+\//.test(content) || /(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{32,})/.test(content)) throw new Error(`Possible personal path or credential in ${file}`);
  }
  process.stdout.write(JSON.stringify({ ok: true, version: pkg.version, files: Object.keys(files), note: 'Explicit package files checked; this does not authorize publication.' }, null, 2) + '\n');
} catch (error) { process.stderr.write(JSON.stringify({ ok: false, error: error.message }) + '\n'); process.exitCode = 1; }
