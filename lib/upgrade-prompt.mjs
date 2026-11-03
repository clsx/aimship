import { createInterface } from 'node:readline';

// Only the terminal entry point opts in; the programmatic CLI remains noninteractive.
export function confirmUpgrade(warning, { input, output, signals = process }) {
  output.write(`Aimship: ${warning.fromVersion} → ${warning.toVersion}\n\n${warning.warningZh}\n${warning.message}\n\n`);
  return new Promise((resolve, reject) => {
    const reader = createInterface({ input, output, terminal: true });
    let settled = false;
    function finish(accepted, error) {
      if (settled) return;
      settled = true;
      signals.removeListener('SIGINT', cancel);
      input.removeListener('error', failed);
      reader.close();
      if (!accepted) output.write('\n');
      if (error) reject(error); else resolve(accepted);
    }
    const cancel = () => finish(false);
    const failed = error => finish(false, error);
    reader.once('line', answer => finish(!input.readableEnded && /^[yY]$/.test(answer.trim())));
    reader.once('close', cancel);
    reader.once('SIGINT', cancel);
    reader.once('error', failed);
    input.once('error', failed);
    signals.once('SIGINT', cancel);
    if (input.destroyed || input.readableEnded) return cancel();
    reader.setPrompt('输入 y 继续升级，其他输入取消（默认取消）。\nType y to upgrade; any other input cancels (default: cancel): ');
    reader.prompt();
  });
}
