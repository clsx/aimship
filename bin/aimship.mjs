#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { run } from '../lib/cli.mjs';

export async function main(argv = process.argv.slice(2), options = {}) {
  try {
    const data = await run(argv, { sourceRoot: path.dirname(path.dirname(fileURLToPath(import.meta.url))), ...options });
    process.stdout.write(JSON.stringify({ ok: true, ...data }, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(JSON.stringify({ ok: false, error: { code: error.code ?? 'IO_ERROR', message: error.message, recovery: error.recovery ?? 'Inspect the error and existing files; retry only after resolving the cause.', ...(error.details === undefined ? {} : { details: error.details }) } }, null, 2) + '\n');
    process.exitCode = 1;
  }
}
const invokedPath = process.argv[1] ? await fs.realpath(process.argv[1]).catch(() => null) : null;
if (invokedPath === await fs.realpath(fileURLToPath(import.meta.url))) await main();
