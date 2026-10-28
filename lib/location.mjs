import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fail, inside, noSymlinks } from './io.mjs';

const recovery = 'Use a delivery folder under the configured dataRoot, or preserve the user’s explicit location decision in a local source file. Do not fall back to the current workspace.';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Resolve existing ancestors without creating a directory or following a managed
// symlink. Appended missing components retain their intended location.
async function location(target, writable = false) {
  await noSymlinks(target);
  let ancestor = target;
  const missing = [];
  while (true) {
    let stat;
    try { stat = await fs.stat(ancestor); }
    catch (error) {
      if (error.code !== 'ENOENT') fail('LOCATION_ACCESS', `Cannot inspect the delivery location: ${ancestor}`, recovery, { cause: error.code });
      const parent = path.dirname(ancestor);
      if (parent === ancestor) fail('LOCATION_ACCESS', `Cannot locate an existing parent: ${target}`, recovery);
      missing.unshift(path.basename(ancestor)); ancestor = parent; continue;
    }
    if (!stat.isDirectory()) fail('LOCATION_PATH', `The location or its parent is not a directory: ${ancestor}`, recovery);
    try {
      if (writable) await fs.access(ancestor, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
      return path.join(await fs.realpath(ancestor), ...missing);
    } catch (error) { fail('LOCATION_ACCESS', `Cannot access the delivery location: ${ancestor}`, recovery, { cause: error.code }); }
  }
}

async function explicitDecision(directory, reference) {
  if (typeof reference !== 'string' || !reference.trim() || reference.includes('\0') || reference.includes('\\') || reference.includes('#') || reference.includes(':') || path.isAbsolute(reference) || reference.split('/').includes('..')) {
    fail('INVALID_STORAGE', 'An explicit location needs a delivery-relative local decisionRef.', recovery);
  }
  const file = path.resolve(directory, reference);
  if (file === directory || !inside(directory, file)) fail('INVALID_STORAGE', 'The location decision must be a file inside this delivery.', recovery);
  await noSymlinks(file);
  try {
    if (!(await fs.stat(file)).isFile() || !(await fs.readFile(file, 'utf8')).trim()) fail('INVALID_STORAGE', 'The location decision must be a nonempty readable file.', recovery);
  } catch (error) {
    if (error.code === 'INVALID_STORAGE') throw error;
    fail('LOCATION_DECISION', `Cannot read the explicit location decision: ${reference}`, recovery, { cause: error.code });
  }
}

/** New initialization only. Existing deliveries keep their saved identity/location. */
export async function validateInitLocation(directory, input, runtime = {}) {
  const root = runtime.dataRoot === undefined ? path.join(os.homedir(), 'Aimship') : runtime.dataRoot;
  if (typeof root !== 'string' || !root.trim() || root.includes('\0') || !path.isAbsolute(root)) fail('INVALID_STORAGE', 'The configured dataRoot must be an absolute path.', recovery);
  if (typeof directory !== 'string' || !directory.trim() || directory.includes('\0')) fail('INVALID_STORAGE', 'A delivery location is required.', recovery);
  const storage = input?.storage;
  if (storage !== undefined && (!object(storage) || !['configured','explicit'].includes(storage.mode) || Object.keys(storage).some(key => !['mode','decisionRef'].includes(key)) || (storage.mode === 'configured' && storage.decisionRef !== undefined))) {
    fail('INVALID_STORAGE', 'storage accepts only a location mode and an explicit decisionRef; dataRoot is tool-managed.', recovery);
  }
  const dataRoot = await location(path.resolve(root));
  const target = await location(path.resolve(directory), true);
  if (target === dataRoot) fail('INIT_LOCATION_ROOT', 'A delivery needs its own folder; dataRoot itself is not a delivery.', recovery);
  if (storage?.mode === 'explicit') {
    await explicitDecision(target, storage.decisionRef);
    return { mode: 'explicit', dataRoot, decisionRef: storage.decisionRef };
  }
  if (!inside(dataRoot, target)) fail('INIT_LOCATION_REQUIRED', 'The initialization target is outside the configured dataRoot and has no explicit location decision.', recovery, { directory: target, dataRoot });
  return { mode: 'configured', dataRoot };
}
