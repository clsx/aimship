import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export class AimshipError extends Error {
  constructor(code, message, recovery, details) {
    super(message); Object.assign(this, { code, recovery, details });
  }
}
export function fail(code, message, recovery, details) { throw new AimshipError(code, message, recovery, details); }
export const json = value => JSON.stringify(value, null, 2) + '\n';
export const hash = value => createHash('sha256').update(value).digest('hex');
export async function exists(file) { try { await fs.lstat(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
export async function readJSON(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { fail(e.code === 'ENOENT' ? 'NOT_FOUND' : 'INVALID_JSON', `Cannot read JSON: ${file}`, 'Read the file and recent recovery copy before making changes.', { cause: e.message }); }
}
export function inside(root, target) { const rel = path.relative(root, target); return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep)); }
export async function noSymlinks(target) {
  const absolute = path.resolve(target); const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) fail('SYMLINK', `Refusing managed path through a symbolic link: ${current}`, 'Choose a real directory or resolve ownership explicitly.'); }
    catch (e) { if (e.code === 'ENOENT') return; throw e; }
  }
}
export async function atomicWrite(file, data) {
  await noSymlinks(file);
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.open(tmp, 'wx', 0o600); await handle.writeFile(data); await handle.sync(); await handle.close(); handle = undefined;
    await fs.rename(tmp, file);
  } finally { await handle?.close(); await fs.rm(tmp, { force: true }); }
}
export async function withLock(file, fn) {
  await noSymlinks(file); let handle;
  try { handle = await fs.open(file, 'wx', 0o600); }
  catch (e) { if (e.code === 'EEXIST') fail('LOCKED', `Another write or interrupted operation owns ${file}`, 'Ensure no writer is active, inspect the lock, then remove only this lock and retry.'); throw e; }
  try { await handle.writeFile(json({ pid: process.pid, createdAt: new Date().toISOString() })); return await fn(); }
  finally { await handle.close(); await fs.rm(file, { force: true }); }
}
export async function listFiles(root, prefix = '') {
  const files = [];
  for (const item of await fs.readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, item.name);
    if (item.isSymbolicLink()) fail('SYMLINK', `Release contains a symbolic link: ${relative}`, 'Package ordinary files inside the release root.');
    if (item.isDirectory()) files.push(...await listFiles(root, relative));
    else if (item.isFile()) files.push(relative);
    else fail('FILE_TYPE', `Unsupported release file: ${relative}`, 'Use ordinary files and directories.');
  }
  return files.sort();
}
export async function fileHash(file) { return hash(await fs.readFile(file)); }
