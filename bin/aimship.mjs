#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { run } from '../lib/cli.mjs';
import { confirmUpgrade } from '../lib/upgrade-prompt.mjs';

export async function main(argv = process.argv.slice(2), options = {}) {
  const { input = process.stdin, output = process.stdout, errorOutput = process.stderr, ...context } = options;
  let prompted = false;
  try {
    const data = await run(argv, { sourceRoot: path.dirname(path.dirname(fileURLToPath(import.meta.url))), ...context,
      confirmUpgrade: input.isTTY && output.isTTY && errorOutput.isTTY ? warning => {
        prompted = true;
        return confirmUpgrade(warning, { input, output });
      } : undefined });
    if (prompted) output.write(data.data.result === 'cancelled'
      ? '已取消升级，当前版本保持不变。\nUpgrade cancelled; your current version is unchanged.\n'
      : '升级完成。请刷新 AI 工具规则或新建会话。\nUpgrade complete. Reload your AI tool’s rules or start a new session.\n');
    else output.write(JSON.stringify({ ok: true, ...data }, null, 2) + '\n');
    if (prompted && data.data.preserved?.length) output.write(`以下修改过的文件已保留 / Modified files preserved:\n${data.data.preserved.join('\n')}\n`);
  } catch (error) {
    const failure = { code: error.code ?? 'IO_ERROR', message: error.message, recovery: error.recovery ?? 'Inspect the error and existing files; retry only after resolving the cause.', ...(error.details === undefined ? {} : { details: error.details }) };
    if (prompted) errorOutput.write(`升级失败 / Upgrade failed [${failure.code}]: ${failure.message}\n${failure.recovery}\n${failure.details ? JSON.stringify(failure.details, null, 2) + '\n' : ''}`);
    else errorOutput.write(JSON.stringify({ ok: false, error: failure }, null, 2) + '\n');
    process.exitCode = 1;
  }
}
const invokedPath = process.argv[1] ? await fs.realpath(process.argv[1]).catch(() => null) : null;
if (invokedPath === await fs.realpath(fileURLToPath(import.meta.url))) await main();
