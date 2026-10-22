import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { atomicWrite, exists, fail, fileHash, hash, inside, json, listFiles, noSymlinks, readJSON, withLock } from './io.mjs';

export const HOSTS = ['codex', 'cursor', 'claude-code'];
const validVersion = version => typeof version === 'string' && /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(version);
const REQUIRED_RELEASE_FILES = ['package.json', 'bin/aimship.mjs', 'lib/cli.mjs', 'lib/install.mjs', 'lib/state.mjs', 'lib/io.mjs', 'skills/aimship/SKILL.md', 'skills/aimship/references/core.md'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function relativeFile(file) { return typeof file === 'string' && file.length > 0 && !path.isAbsolute(file) && !/^[/\\]|^[a-zA-Z]:/.test(file) && !file.split(/[\\/]/).some(part => part === '..' || part === ''); }
function managedFile(file) {
  const normalized = file.replaceAll('\\', '/');
  return relativeFile(file) && (normalized === '.aimship/bin/aimship.mjs' || /^\.(agents|claude|cursor)\/skills\/aimship\/(SKILL\.md|agents\/.+)$/.test(normalized));
}
function validateManifest(manifest) {
  if (!object(manifest) || manifest.schemaVersion !== 1 || manifest.product !== 'aimship' || !object(manifest.managed) || !object(manifest.releases) || !Array.isArray(manifest.hosts)) fail('INSTALL_FORMAT', 'Unknown or invalid installation manifest.', 'Preserve the installation and use a compatible installer.');
  for (const [file, value] of Object.entries({ ...manifest.managed, ...(manifest.pending?.managed ?? {}) })) if (!managedFile(file) || !digest(value)) fail('INSTALL_FORMAT', 'Unsafe managed path or digest in installation manifest.', 'Inspect the manifest before proceeding.');
  for (const [version, release] of Object.entries(manifest.releases)) if (!validVersion(version) || !object(release) || !object(release.files) || !REQUIRED_RELEASE_FILES.every(file => digest(release.files[file])) || !Object.entries(release.files).every(([file, value]) => relativeFile(file) && digest(value))) fail('INSTALL_FORMAT', 'Unsafe or incomplete release version/file list in manifest.', 'Inspect the manifest before proceeding.');
  if (!['empty', 'pending', 'complete', 'uninstalled'].includes(manifest.status)) fail('INSTALL_FORMAT', 'Unknown installation status in manifest.', 'Use a compatible installer and preserve this manifest.');
  if (!manifest.hosts.every(x => HOSTS.includes(x))) fail('INSTALL_FORMAT', 'Unknown registered host.', 'Use a compatible installer.');
  if (manifest.activeVersion != null && !validVersion(manifest.activeVersion)) fail('INSTALL_FORMAT', 'Invalid recorded active version.', 'Inspect the retained manifest.');
  if (manifest.activeVersion != null && !digest(manifest.activeDigest)) fail('INSTALL_FORMAT', 'Missing or invalid active-pointer digest.', 'Inspect the retained manifest before changing the installation.');
  if (manifest.pending && (!object(manifest.pending) || !validVersion(manifest.pending.version) || !Array.isArray(manifest.pending.hosts) || !manifest.pending.hosts.every(host => HOSTS.includes(host)) || !object(manifest.pending.managed))) fail('INSTALL_FORMAT', 'Invalid pending installation record.', 'Preserve the manifest and recover with the exact installer.');
  return manifest;
}
export async function readConfig(file) {
  await noSymlinks(file);
  const recovery = 'Preserve the existing config and delivery data. Restore a supported config.json with schemaVersion 1 and an absolute dataRoot, then retry; do not silently replace it with defaults.';
  let config;
  try { config = await readJSON(file); } catch (error) { fail('CONFIG_READ', 'Cannot read the retained installation config.', recovery, { configPath: file, cause: error.code }); }
  if (!object(config) || config.schemaVersion !== 1 || typeof config.dataRoot !== 'string' || !config.dataRoot.trim() || config.dataRoot.includes('\0') || !path.isAbsolute(config.dataRoot)) fail('CONFIG_FORMAT', 'Unsupported config schema or invalid dataRoot.', recovery, { configPath: file });
  return config;
}
export function installPaths(home = os.homedir()) {
  const absolute = path.resolve(home); const root = path.join(absolute, '.aimship');
  return { home: absolute, root, active: path.join(root, 'active.json'), manifest: path.join(root, 'install-manifest.json'), config: path.join(root, 'config.json'), launcher: path.join(root, 'bin', 'aimship.mjs'), lock: path.join(root, '.install.lock') };
}
async function inspectJSON(file, validate = value => value) {
  try {
    await noSymlinks(file);
    if (!await exists(file)) return { status: 'missing', path: file, value: null };
    return { status: 'valid', path: file, value: validate(await readJSON(file)) };
  } catch (error) { return { status: 'invalid', path: file, value: null, error: { code: error.code ?? 'IO_ERROR', message: error.message, recovery: error.recovery ?? 'Inspect this managed file before making changes.' } }; }
}
function validateActive(active) {
  if (!object(active) || active.launcherProtocol !== 1 || !validVersion(active.version)) fail('INSTALL_FORMAT', 'Invalid or unsupported active pointer.', 'Restore the active pointer using the exact package install.');
  return active;
}
export async function installationVersion(options = {}) {
  const p = installPaths(options.home);
  const manifest = await inspectJSON(p.manifest, validateManifest);
  const active = await inspectJSON(p.active, validateActive);
  if (active.status === 'valid' && manifest.status === 'valid') active.integrity = [manifest.value.activeDigest, manifest.value.pending?.activeDigest].filter(Boolean).includes(await fileHash(p.active)) ? 'intact' : 'modified';
  const pending = manifest.value?.pending ?? null;
  let installation = 'not-installed';
  if (manifest.status === 'invalid' || active.status === 'invalid' || active.integrity === 'modified') installation = 'damaged';
  else if (manifest.status === 'missing') installation = active.status === 'valid' || await exists(p.launcher) ? 'unmanaged' : 'not-installed';
  else if (pending) installation = 'incomplete';
  else if (manifest.value.status === 'uninstalled' && active.status === 'missing') installation = 'uninstalled';
  else if (active.status === 'valid' && active.value.version === manifest.value.activeVersion) installation = 'installed';
  else installation = 'damaged';
  return { installation, installedActiveVersion: active.value?.version ?? null, recordedActiveVersion: manifest.value?.activeVersion ?? null, pending, manifest, active, paths: p };
}
async function inspectManagedFile(file, expected, pendingExpected) {
  try {
    await noSymlinks(file);
    if (!await exists(file)) return { path: file, present: false, integrity: 'missing' };
    if (!(await fs.lstat(file)).isFile()) return { path: file, present: true, integrity: 'invalid-file-type' };
    const actual = expected || pendingExpected ? await fileHash(file) : null;
    return { path: file, present: true, integrity: actual && actual === expected ? 'intact' : (actual && actual === pendingExpected ? 'pending' : (expected ? 'modified' : 'unmanaged')) };
  } catch (error) { return { path: file, present: null, integrity: 'inaccessible', error: { code: error.code ?? 'IO_ERROR', message: error.message } }; }
}
export async function installationStatus(options = {}) {
  const version = await installationVersion(options); const p = version.paths; const manifest = version.manifest.value;
  const issues = [];
  for (const report of [version.manifest, version.active]) if (report.status === 'invalid') issues.push({ path: report.path, ...report.error });
  if (version.installation === 'damaged' && !issues.length) issues.push({ code: 'ACTIVE_MISMATCH', message: 'The active pointer is missing or differs from the recorded activation.' });
  if (version.installation === 'unmanaged') issues.push({ code: 'UNOWNED_INSTALL', message: 'Fixed installation files exist without a valid Aimship manifest.' });
  const launcherKey = path.join('.aimship', 'bin', 'aimship.mjs');
  const launcher = await inspectManagedFile(p.launcher, manifest?.managed[launcherKey], manifest?.pending?.managed?.[launcherKey]);
  if (manifest?.activeVersion && launcher.integrity !== 'intact') issues.push({ code: 'LAUNCHER_INTEGRITY', path: p.launcher, integrity: launcher.integrity });
  const managedFiles = [];
  if (manifest) for (const file of new Set([...Object.keys(manifest.managed), ...Object.keys(manifest.pending?.managed ?? {})])) managedFiles.push(await inspectManagedFile(path.join(p.home, file), manifest.managed[file], manifest.pending?.managed?.[file]));
  for (const report of managedFiles) if (report.integrity !== 'intact') issues.push({ code: report.integrity === 'pending' ? 'PENDING_FILE' : 'MANAGED_FILE_INTEGRITY', path: report.path, integrity: report.integrity });
  let config;
  if (!await exists(p.config)) config = { path: p.config, status: 'missing', dataRoot: null };
  else {
    try { config = { path: p.config, status: 'valid', dataRoot: (await readConfig(p.config)).dataRoot }; }
    catch (error) { config = { path: p.config, status: 'invalid', dataRoot: null, error: { code: error.code ?? 'IO_ERROR', message: error.message, recovery: error.recovery } }; issues.push({ path: p.config, ...config.error }); }
  }
  if (manifest?.activeVersion && config.status === 'missing') issues.push({ code: 'CONFIG_MISSING', path: p.config });
  let release = null;
  if (version.installedActiveVersion) {
    const files = manifest?.releases[version.installedActiveVersion]?.files;
    const releaseRoot = path.join(p.root, 'releases', version.installedActiveVersion);
    const reports = [];
    if (files) for (const [file, expected] of Object.entries(files)) reports.push(await inspectManagedFile(path.join(releaseRoot, file), expected));
    release = { version: version.installedActiveVersion, root: releaseRoot, integrity: files ? (reports.every(x => x.integrity === 'intact') ? 'intact' : 'damaged') : 'unknown', files: reports };
    if (release.integrity !== 'intact') issues.push({ code: 'RELEASE_INTEGRITY', path: releaseRoot, integrity: release.integrity });
  }
  const hosts = [];
  for (const host of HOSTS) {
    const directory = hostDirectories([host])[0]; const entryPath = path.join(p.home, directory, 'SKILL.md');
    const entry = managedFiles.find(x => x.path === entryPath) ?? await inspectManagedFile(entryPath, undefined);
    const registered = manifest ? manifest.hosts.includes(host) : null;
    const entryFiles = managedFiles.filter(file => file.path.startsWith(path.dirname(entryPath) + path.sep));
    const entryIntegrity = entry.integrity === 'intact' && entryFiles.some(file => file.integrity !== 'intact') ? 'damaged' : entry.integrity;
    if (registered && entryIntegrity !== 'intact') issues.push({ code: 'HOST_ENTRY_INTEGRITY', host, path: entryPath, integrity: entryIntegrity });
    hosts.push({ host, registered, entryPath, entryPresent: entry.present, entryIntegrity, sharedWith: HOSTS.filter(other => other !== host && hostDirectories([other])[0] === directory), hostLoaded: 'not-verified', login: 'not-verified', permissions: 'not-verified' });
  }
  const unselectedHostDiscoveryPossible = hosts.some(x => x.registered !== true) && hosts.some(x => x.entryPresent === true);
  return { installation: version.installation === 'installed' && issues.length ? 'damaged' : version.installation, healthy: version.installation === 'installed' && issues.length === 0, installedActiveVersion: version.installedActiveVersion, recordedActiveVersion: version.recordedActiveVersion, pending: version.pending, registeredHosts: manifest ? manifest.hosts : null, hosts, unselectedHostDiscoveryPossible, manifest: { path: p.manifest, status: version.manifest.status, recordedStatus: manifest?.status ?? null }, active: { path: p.active, status: version.active.status, integrity: version.active.integrity ?? 'unknown' }, launcher, config, customPath: path.join(p.root, 'custom'), release, issues, scope: 'Only Aimship manifest paths and fixed installation/entry files were inspected. Delivery data, custom contents, host loading, login, and permissions were not inspected.', discovery: 'Host discovery can expose a shared entry to an unregistered host. Registration and file presence do not prove host loading or access.' };
}
export async function releaseFiles(source) {
  const pkg = await readJSON(path.join(source, 'package.json'));
  if (pkg.name !== 'aimship' || !validVersion(pkg.version) || !Array.isArray(pkg.files)) fail('INVALID_RELEASE', 'Release package metadata is invalid.', 'Use a complete Aimship package.');
  const files = new Set(['package.json']);
  for (const entry of pkg.files) {
    if (typeof entry !== 'string' || !entry || path.isAbsolute(entry) || entry.split(/[\\/]/).includes('..') || /[*?{}!]/.test(entry)) fail('INVALID_RELEASE', 'Package files must be explicit in-root files or directories.', 'Review package.json files.');
    const target = path.join(source, entry); if (!await exists(target)) continue;
    await noSymlinks(target);
    if ((await fs.lstat(target)).isDirectory()) for (const name of await listFiles(target)) files.add(path.join(entry, name));
    else files.add(entry);
  }
  const result = {};
  for (const name of [...files].sort()) {
    if (path.basename(name) === '.DS_Store' || path.basename(name).startsWith('._')) continue;
    if (!inside(source, path.resolve(source, name))) fail('INVALID_RELEASE', 'Package path escapes root.', 'Use ordinary in-root files.');
    result[name] = await fileHash(path.join(source, name));
  }
  for (const required of REQUIRED_RELEASE_FILES) if (!result[required]) fail('INCOMPLETE_RELEASE', `Required release file is missing: ${required}`, 'Use the complete package; do not install partial source.');
  return { pkg, files: result };
}
const launcherText = `#!/usr/bin/env node
// Managed by Aimship. Local Node is required; this launcher never uses npm cache.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
try {
  let version;
  const valid = value => typeof value === 'string' && /^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(value);
  try {
    const active = JSON.parse(await fs.readFile(path.join(root, 'active.json'), 'utf8'));
    if (active.launcherProtocol !== 1 || !valid(active.version)) throw new Error('Unsupported or invalid active pointer.');
    version = active.version;
  } catch (error) {
    if (process.argv[2] !== 'status' && !process.argv.slice(2).includes('--version')) throw error;
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'install-manifest.json'), 'utf8'));
    const recorded = manifest.activeVersion ?? manifest.pending?.version;
    if (manifest.schemaVersion !== 1 || manifest.product !== 'aimship' || !valid(recorded)) throw new Error('Cannot locate a diagnostic tool safely. Run status from the exact package installer.');
    version = recorded;
  }
  const cli = path.join(root, 'releases', version, 'bin', 'aimship.mjs');
  const { main } = await import(pathToFileURL(cli).href);
  await main(process.argv.slice(2), { installRoot: root });
} catch (error) {
  process.stderr.write(JSON.stringify({ ok: false, error: { code: 'LAUNCHER_FAILURE', message: error.message, recovery: 'Run the exact local package install again. Preserve delivery data and custom files.' } }) + '\\n');
  process.exitCode = 1;
}
`;
function hostDirectories(hosts) {
  const dirs = new Set();
  if (hosts.includes('codex') || hosts.includes('cursor')) dirs.add('.agents/skills/aimship');
  if (hosts.includes('claude-code')) dirs.add('.claude/skills/aimship');
  return [...dirs];
}
async function desiredFiles(source, p, hosts, version) {
  const result = { '.aimship/bin/aimship.mjs': launcherText };
  const skillRoot = path.join(source, 'skills', 'aimship');
  const files = await listFiles(skillRoot);
  for (const dir of hostDirectories(hosts)) {
    for (const file of files) {
      // References are resolved through bind to the immutable release, avoiding duplicate rule copies.
      if (file !== 'SKILL.md' && !file.startsWith('agents' + path.sep)) continue;
      const raw = await fs.readFile(path.join(skillRoot, file), 'utf8');
      result[path.join(dir, file)] = raw.replaceAll('{{AIMSHIP_LAUNCHER}}', p.launcher).replaceAll('{{AIMSHIP_NODE}}', process.execPath)
        .replace(/\]\((references\/[^)]+)\)/g, (_, relative) => `](<${path.join(p.root, 'releases', version, 'skills', 'aimship', relative)}>)`);
    }
  }
  return result;
}
async function loadManifest(p) {
  if (await exists(p.manifest)) return validateManifest(await readJSON(p.manifest));
  if (await exists(p.active) || await exists(p.launcher)) fail('UNOWNED_INSTALL', 'Existing installation files have no Aimship manifest.', 'Preserve these files; restore their manifest or choose an isolated home.');
  return { schemaVersion: 1, product: 'aimship', managed: {}, releases: {}, hosts: [], status: 'empty', previousVersion: null };
}
async function verifyManaged(p, manifest, desired) {
  for (const file of Object.keys(desired)) {
    const target = path.join(p.home, file); await noSymlinks(target);
    if (!await exists(target)) continue;
    const actual = await fileHash(target);
    if (!manifest.managed[file] && !manifest.pending?.managed?.[file]) fail('FOREIGN_FILE', `Existing file is not managed by Aimship: ${target}`, 'Keep the existing file and resolve the name conflict explicitly.');
    if (actual !== manifest.managed[file] && actual !== manifest.pending?.managed?.[file]) fail('USER_MODIFIED', `Managed file was modified: ${target}`, 'Preserve the modification; merge it or move custom instructions into .aimship/custom before retrying.');
  }
}
async function compareTree(root, expected) {
  if (!await exists(root)) return false;
  const actualFiles = await listFiles(root);
  if (actualFiles.length !== Object.keys(expected).length) return false;
  for (const file of actualFiles) if (!expected[file] || await fileHash(path.join(root, file)) !== expected[file]) return false;
  return true;
}
async function prepareRelease(source, p, pkg, files, manifest) {
  const target = path.join(p.root, 'releases', pkg.version); await noSymlinks(target);
  if (await exists(target)) {
    if (!manifest.releases[pkg.version]) fail('FOREIGN_RELEASE', `Existing release is not managed: ${target}`, 'Preserve the folder and resolve ownership.');
    const recorded = manifest.releases[pkg.version].files;
    const actual = await listFiles(target);
    let conflict = Object.keys(recorded).length !== Object.keys(files).length || Object.entries(files).some(([file, digest]) => recorded[file] !== digest);
    for (const file of actual) if (!files[file] || await fileHash(path.join(target, file)) !== files[file]) conflict = true;
    if (conflict) fail('RELEASE_CONFLICT', `Installed ${pkg.version} differs from the package.`, 'Keep the installed files; use a new version for changed product files, or reconcile user changes explicitly.');
    // Only absent, previously recorded files may be repaired; existing modifications are never replaced.
    for (const file of Object.keys(files)) if (!actual.includes(file)) {
      const destination = path.join(target, file); await noSymlinks(destination); await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.copyFile(path.join(source, file), destination, fs.constants.COPYFILE_EXCL);
    }
    return;
  }
  const staging = path.join(p.root, 'releases', `.staging-${randomUUID()}`);
  await fs.mkdir(staging, { recursive: true });
  try {
    for (const file of Object.keys(files)) { const destination = path.join(staging, file); await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.copyFile(path.join(source, file), destination, fs.constants.COPYFILE_EXCL); }
    if (!await compareTree(staging, files)) fail('COPY_INTEGRITY', 'Staged release did not match the source.', 'Retry the same exact package; no activation has occurred.');
    // Register ownership before rename so an interruption after rename can be resumed.
    manifest.releases[pkg.version] = { files };
    await atomicWrite(p.manifest, json(manifest));
    await fs.rename(staging, target);
  } finally { await fs.rm(staging, { recursive: true, force: true }); }
}
async function pruneReleases(p, manifest) {
  const preserved = [];
  for (const [version, release] of Object.entries(manifest.releases)) {
    if ([manifest.activeVersion, manifest.previousVersion].includes(version)) continue;
    const root = path.join(p.root, 'releases', version);
    if (!await exists(root)) { delete manifest.releases[version]; continue; }
    try {
      await noSymlinks(root);
      if (await compareTree(root, release.files)) { await fs.rm(root, { recursive: true }); delete manifest.releases[version]; }
      else preserved.push(root);
    } catch (error) { if (error.code === 'SYMLINK') preserved.push(root); else throw error; }
  }
  return preserved;
}
function compareVersions(left, right) {
  const parts = version => { const separator = version.indexOf('-'); return separator < 0 ? [version, undefined] : [version.slice(0, separator), version.slice(separator + 1)]; };
  const [leftCore, leftPre] = parts(left); const [rightCore, rightPre] = parts(right);
  const a = leftCore.split('.').map(Number); const b = rightCore.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  if (leftPre === rightPre) return 0;
  if (leftPre === undefined || rightPre === undefined) return leftPre === undefined ? 1 : -1;
  const ap = leftPre.split('.'); const bp = rightPre.split('.');
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    if (ap[i] === undefined || bp[i] === undefined) return ap[i] === undefined ? -1 : 1;
    if (ap[i] === bp[i]) continue;
    const an = /^[0-9]+$/.test(ap[i]); const bn = /^[0-9]+$/.test(bp[i]);
    if (an && bn) return Number(ap[i]) > Number(bp[i]) ? 1 : -1;
    if (an !== bn) return an ? -1 : 1;
    return ap[i] > bp[i] ? 1 : -1;
  }
  return 0;
}
function installAction(fromVersion, toVersion, addedHosts) {
  if (!fromVersion) return 'install';
  if (fromVersion !== toVersion) return compareVersions(toVersion, fromVersion) > 0 ? 'upgrade' : 'switch-version';
  return addedHosts.length ? 'add-hosts' : 'reinstall';
}
export async function install(source, options = {}) {
  const p = installPaths(options.home);
  let facts = { fromVersion: null, toVersion: null, action: 'install', addedHosts: [], fromVersionKnown: false };
  try {
    const metadata = await readJSON(path.join(source, 'package.json')); facts.toVersion = metadata.version ?? null;
    await noSymlinks(p.root); await fs.mkdir(p.root, { recursive: true });
    return await withLock(p.lock, async () => {
    const manifest = await loadManifest(p); facts.fromVersion = manifest.activeVersion ?? null; facts.fromVersionKnown = true;
    const { pkg, files } = await releaseFiles(source);
    const fromVersion = manifest.activeVersion ?? null; const addedHosts = [...new Set(options.hosts ?? manifest.pending?.hosts ?? [])].filter(host => !manifest.hosts.includes(host));
    facts = { fromVersion, toVersion: pkg.version, action: installAction(fromVersion, pkg.version, addedHosts), addedHosts, fromVersionKnown: true };
    const resumed = Boolean(manifest.pending);
    if (await exists(p.active)) {
      await noSymlinks(p.active);
      const digest = await fileHash(p.active);
      if (digest !== manifest.activeDigest && digest !== manifest.pending?.activeDigest) fail('USER_MODIFIED', 'The active installation pointer was modified.', 'Preserve the pointer and reconcile it with the last complete installation before retrying.');
    }
    const hosts = [...new Set([...manifest.hosts, ...(manifest.pending?.hosts ?? []), ...(options.hosts ?? [])])];
    facts.addedHosts = hosts.filter(host => !manifest.hosts.includes(host)); facts.action = installAction(fromVersion, pkg.version, facts.addedHosts);
    if (!hosts.length && !fromVersion) fail('HOST_REQUIRED', 'Choose at least one host for the first install.', 'Repeat install --host codex, --host cursor, or --host claude-code; --host is repeatable.');
    if (!hosts.every(x => HOSTS.includes(x))) fail('INVALID_HOST', 'Unknown install host.', `Supported hosts: ${HOSTS.join(', ')}.`);
    if (manifest.pending && manifest.pending.version !== pkg.version) fail('PENDING_INSTALL', `Installation of ${manifest.pending.version} is incomplete.`, 'Resume the same exact package install before selecting a different version.');
    const desired = await desiredFiles(source, p, hosts, pkg.version); await verifyManaged(p, manifest, desired);
    let repairsNeeded = !(await exists(path.join(p.root, 'releases', pkg.version))) || !(await exists(p.active)) || !(await exists(p.config)) || !(await exists(path.join(p.root, 'custom')));
    // A present release directory can still need repair when only an internal managed file is missing.
    for (const file of Object.keys(files)) if (!await exists(path.join(p.root, 'releases', pkg.version, file))) repairsNeeded = true;
    for (const file of Object.keys(desired)) if (!await exists(path.join(p.home, file))) repairsNeeded = true;
    const managed = Object.fromEntries(Object.entries(desired).map(([file, data]) => [file, hash(data)]));
    const activeData = json({ version: pkg.version, launcherProtocol: 1 });
    manifest.status = 'pending'; manifest.pending = { version: pkg.version, hosts, managed, previousActive: manifest.activeVersion ?? null, activeDigest: hash(activeData) };
    await atomicWrite(p.manifest, json(manifest));
    try {
      await prepareRelease(source, p, pkg, files, manifest);
      for (const [file, data] of Object.entries(desired)) {
        const target = path.join(p.home, file); await noSymlinks(target); await fs.mkdir(path.dirname(target), { recursive: true });
        if (!await exists(target) || await fileHash(target) !== managed[file]) await atomicWrite(target, data);
      }
      if (!await exists(p.config)) await atomicWrite(p.config, json({ schemaVersion: 1, dataRoot: options.dataRoot ? path.resolve(options.dataRoot) : path.join(p.home, 'Aimship') }));
      else await readConfig(p.config);
      await noSymlinks(path.join(p.root, 'custom')); await fs.mkdir(path.join(p.root, 'custom'), { recursive: true });
      await atomicWrite(p.active, activeData);
      if (manifest.activeVersion && manifest.activeVersion !== pkg.version) manifest.previousVersion = manifest.activeVersion;
      manifest.activeVersion = pkg.version; manifest.activeDigest = hash(activeData); manifest.hosts = hosts; manifest.managed = managed; manifest.status = 'complete'; delete manifest.pending; delete manifest.lastError;
      const preserved = await pruneReleases(p, manifest); await atomicWrite(p.manifest, json(manifest));
      return { version: pkg.version, ...facts, activeVersion: pkg.version, result: resumed ? 'recovered' : (facts.action === 'reinstall' ? (repairsNeeded ? 'repaired' : 'unchanged') : 'success'), resumed, ...p, hosts, entries: hostDirectories(hosts).map(x => path.join(p.home, x, 'SKILL.md')), preserved, node: process.execPath, dataDirectoryCreated: false, reload: 'Reload host skill discovery or start a new session if its selector still shows an old entry.' };
    } catch (error) {
      manifest.lastError = { code: error.code ?? 'IO_ERROR', message: error.message }; await atomicWrite(p.manifest, json(manifest));
      fail('INSTALL_INCOMPLETE', 'Installation is incomplete; existing delivery data was not touched.', 'Inspect details and retry the same exact package install. The manifest records pending paths; activation may still point to the previous complete release.', { cause: manifest.lastError, pending: manifest.pending, active: await exists(p.active) ? await readJSON(p.active) : null });
    }
    });
  } catch (error) {
    const active = await inspectJSON(p.active, validateActive);
    error.details = { ...error.details, ...facts, activeVersion: active.value?.version ?? null, result: error.code === 'INSTALL_INCOMPLETE' ? 'incomplete' : 'failed' };
    throw error;
  }
}
export async function uninstall(options = {}) {
  const p = installPaths(options.home);
  if (!await exists(p.manifest)) fail('NOT_INSTALLED', 'No managed Aimship installation found.', 'Preserve any unowned files; use the correct home.');
  return withLock(p.lock, async () => {
    const manifest = await loadManifest(p);
    if (manifest.pending) fail('PENDING_INSTALL', 'An installation is incomplete.', 'Resume the exact pending install before uninstalling.');
    const fullUninstall = !options.hosts?.length;
    const removing = fullUninstall ? manifest.hosts : options.hosts;
    const disconnectedHosts = manifest.hosts.filter(host => removing.includes(host));
    if (!removing.every(x => HOSTS.includes(x))) fail('INVALID_HOST', 'Unknown host.', 'Use a registered host name.');
    const remaining = manifest.hosts.filter(x => !removing.includes(x)); const keepDirectories = hostDirectories(remaining);
    const removed = []; const preserved = [];
    for (const [file, digest] of Object.entries(manifest.managed)) {
      if ((!fullUninstall && file.startsWith('.aimship' + path.sep)) || keepDirectories.some(dir => file.startsWith(dir + path.sep))) continue;
      const target = path.join(p.home, file); await noSymlinks(target);
      if (await exists(target)) {
        if (await fileHash(target) === digest) { await fs.rm(target); removed.push(target); }
        else { preserved.push(target); continue; }
      }
      delete manifest.managed[file];
    }
    if (fullUninstall) {
      for (const [version, release] of Object.entries(manifest.releases)) {
        const root = path.join(p.root, 'releases', version); await noSymlinks(root);
        if (!await exists(root)) { delete manifest.releases[version]; continue; }
        if (await compareTree(root, release.files)) { await fs.rm(root, { recursive: true }); removed.push(root); delete manifest.releases[version]; }
        else preserved.push(root);
      }
      // active is managed only if its exact pointer still matches the last complete activation.
      if (await exists(p.active)) {
        const active = await readJSON(p.active);
        if (active.version === manifest.activeVersion && active.launcherProtocol === 1 && await fileHash(p.active) === manifest.activeDigest) { await fs.rm(p.active); removed.push(p.active); } else preserved.push(p.active);
      }
      manifest.activeVersion = null; manifest.previousVersion = null; delete manifest.activeDigest;
    }
    manifest.hosts = remaining; manifest.status = fullUninstall ? 'uninstalled' : 'complete'; await atomicWrite(p.manifest, json(manifest));
    return { action: fullUninstall ? 'uninstall' : 'disconnect-hosts', result: preserved.length ? 'partial' : 'success', disconnectedHosts, remainingHosts: remaining, coreRetained: !fullUninstall, activeVersion: manifest.activeVersion ?? null, sharedEntriesRetained: keepDirectories.map(dir => ({ path: path.join(p.home, dir, 'SKILL.md'), registeredHosts: remaining.filter(host => hostDirectories([host]).includes(dir)), sharedWith: HOSTS.filter(host => hostDirectories([host]).includes(dir)) })), removed, preserved, retained: [p.config, path.join(p.root, 'custom')], data: 'All delivery data is retained. No delivery directory was read or removed.' };
  });
}
