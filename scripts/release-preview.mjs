import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { releaseFiles } from '../lib/install.mjs';
import { assertForwardTags, syncTags } from './release-tags.mjs';

export const registry = 'https://registry.npmjs.org';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const digest = (bytes, algorithm = 'sha256', encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);
const command = (name, args, options = {}) => execFileSync(name, args, { cwd: root, timeout: 180000, maxBuffer: 16 * 1024 * 1024, ...options });
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };

export function validateContext(env, pkg, head) {
  const tag = env.RELEASE_TAG;
  requireThat(/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-preview\.(?:0|[1-9]\d*)$/.test(tag ?? ''), 'Only exact vX.Y.Z-preview.N tags are allowed.');
  requireThat(env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REPOSITORY === 'clsx/aimship', 'Only manual dispatch in clsx/aimship is allowed.');
  requireThat(env.GITHUB_REF === `refs/tags/${tag}`, 'Dispatch ref must be the input tag, not main or another tag.');
  requireThat(/^[a-f0-9]{40}$/.test(head) && head === env.GITHUB_SHA, 'Checkout must match the dispatched commit.');
  requireThat(pkg.name === 'aimship' && pkg.version === tag.slice(1), 'Package name/version must match the release tag.');
  requireThat(pkg.publishConfig?.registry === registry && pkg.publishConfig?.tag === 'preview' && pkg.publishConfig?.access === 'public', 'Unexpected publication configuration.');
  return { tag, version: pkg.version, commit: head };
}

export function publicationDecision(packument, manifest) {
  requireThat(packument?.name === 'aimship' && packument.versions && typeof packument.versions === 'object' && packument['dist-tags']?.latest, 'Incomplete registry response; absence is not confirmed.');
  const existing = packument.versions[manifest.version];
  if (!existing) return 'publish';
  requireThat(existing.dist?.integrity === manifest.integrity, 'Version already exists with different package bytes. Do not overwrite or republish.');
  return 'already-published';
}

async function get(url, json = true) {
  requireThat(new URL(url).origin === registry, 'Only the official npm registry is allowed.');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
  requireThat(response.ok, `Registry request failed: HTTP ${response.status}; no publication attempted from this response.`);
  return json ? response.json() : Buffer.from(await response.arrayBuffer());
}
const readRegistry = () => get(`${registry}/aimship`);

export async function waitForRegistry(manifest, { read = readRegistry, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 25 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const current = await read();
    const decision = publicationDecision(current, manifest);
    assertForwardTags(current, manifest.version);
    if (decision === 'already-published' && current.versions[manifest.version].dist.attestations?.url) return current;
    if (attempt + 1 < attempts) await pause(10000);
  }
  throw new Error('Registry verification is still pending after the bounded wait. Publication may already have succeeded; inspect the registry before retrying.');
}

export async function verifyPackage(file, sourceRoot = root) {
  const { pkg, files } = await releaseFiles(sourceRoot);
  const members = command('tar', ['-tzf', file], { encoding: 'utf8' }).trim().split(/\r?\n/);
  const expected = Object.keys(files).map(name => `package/${name}`).sort();
  requireThat(JSON.stringify([...members].sort()) === JSON.stringify(expected), 'Tarball members differ from the distributable source files.');
  for (const member of members) {
    const bytes = command('tar', ['-xOzf', file, member]);
    requireThat(digest(bytes) === files[member.slice(8)], `Tarball content differs from source: ${member}`);
  }
  const bytes = await fs.readFile(file);
  return { version: pkg.version, files: expected.length, sha256: digest(bytes), integrity: `sha512-${digest(bytes, 'sha512', 'base64')}` };
}

async function context() {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
  const head = command('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const result = validateContext(process.env, pkg, head);
  requireThat(command('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' }).trim() === '', 'Release checkout must be clean.');
  return result;
}

async function prepare(directory) {
  const release = await context();
  await fs.mkdir(directory, { recursive: true });
  requireThat((await fs.readdir(directory)).length === 0, 'Artifact directory must be empty.');
  // Run prepack explicitly; npm pack emits only its JSON when lifecycle output is disabled.
  command('npm', ['run', 'check:package'], { stdio: 'inherit' });
  const packed = JSON.parse(command('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { encoding: 'utf8' }));
  const filename = `aimship-${release.version}.tgz`;
  requireThat(packed.length === 1 && packed[0].filename === filename, 'Unexpected pack output.');
  const verified = await verifyPackage(path.join(directory, filename));
  const before = await readRegistry();
  assertForwardTags(before, release.version);
  const manifest = { ...release, ...verified, filename, latestBefore: before['dist-tags']?.latest };
  manifest.registryStatus = publicationDecision(before, manifest);
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
}

async function publish(directory, verifyOnly = false) {
  const release = await context();
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json')));
  requireThat(manifest.version === release.version && manifest.commit === release.commit && manifest.tag === release.tag && manifest.filename === `aimship-${release.version}.tgz`, 'Artifact does not match the checked-out release.');
  const file = path.join(directory, manifest.filename);
  const actual = await verifyPackage(file);
  requireThat(actual.integrity === manifest.integrity && actual.sha256 === manifest.sha256, 'Artifact changed after validation.');
  const before = await readRegistry();
  assertForwardTags(before, release.version);
  const decision = publicationDecision(before, manifest);
  if (verifyOnly) requireThat(decision === 'already-published', 'Version has not been published.');
  else if (decision === 'publish') {
    // No retry here: an uncertain npm outcome must be checked against the registry first.
    command('npm', ['publish', file, '--registry', registry, '--tag', 'latest', '--access', 'public', '--provenance', '--ignore-scripts'], { stdio: 'inherit' });
  }
  // npm accepts a publication before asynchronous processing makes it visible.
  let after = await waitForRegistry(manifest);
  requireThat(publicationDecision(after, manifest) === 'already-published', 'Published version is not visible.');
  const dist = after.versions[release.version].dist;
  const downloaded = await get(dist.tarball, false);
  requireThat(digest(downloaded) === manifest.sha256, 'Registry package bytes differ from the validated artifact.');
  requireThat(dist.attestations?.url, 'Published package has no provenance attestations.');
  const attestations = await get(dist.attestations.url);
  requireThat(Array.isArray(attestations.attestations) && attestations.attestations.some(item => item.predicateType === 'https://slsa.dev/provenance/v1'), 'SLSA provenance was not returned.');
  if (!verifyOnly) after = await synchronize(release.version, manifest.integrity);
  requireThat(after['dist-tags'].latest === release.version && after['dist-tags'].preview === release.version, 'Release tags have not both been synchronized.');
  const result = { ...manifest, registryStatus: 'verified', distTags: after['dist-tags'], tarball: dist.tarball, attestations: dist.attestations.url };
  await fs.writeFile(path.join(directory, 'published.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `Published and verified aimship ${release.version}\n\nCommit: ${release.commit}\n\nSHA256: ${manifest.sha256}\n\npreview: ${after['dist-tags'].preview}; latest: ${after['dist-tags'].latest}\n\nProvenance: ${dist.attestations.url}\n`);
}

const synchronize = (version, integrity) => syncTags(version, integrity, {
  read: readRegistry,
  add: (target, tag) => command('npm', ['dist-tag', 'add', `aimship@${target}`, tag, '--registry', registry], { stdio: 'inherit' }),
});

export function validateSyncContext(env, pkg, head, commit) {
  requireThat(env.GITHUB_REF === 'refs/heads/main', 'Tag synchronization must run the current main workflow.');
  requireThat(/^[a-f0-9]{40}$/.test(head) && env.GITHUB_SHA === head, 'Checkout must match the dispatched commit.');
  return validateContext({ ...env, GITHUB_REF: `refs/tags/${env.RELEASE_TAG}`, GITHUB_SHA: commit }, pkg, commit);
}

async function synchronizeExisting(directory, checkOnly) {
  const tag = process.env.RELEASE_TAG;
  requireThat(/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-preview\.(?:0|[1-9]\d*)$/.test(tag ?? ''), 'An exact preview tag is required.');
  const head = command('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const commit = command('git', ['rev-parse', `refs/tags/${tag}^{commit}`], { encoding: 'utf8' }).trim();
  const pkg = JSON.parse(command('git', ['show', `${commit}:package.json`], { encoding: 'utf8' }));
  const release = validateSyncContext(process.env, pkg, head, commit);
  requireThat(command('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() === '', 'Release checkout must be clean.');
  const metadata = await readRegistry();
  assertForwardTags(metadata, release.version);
  const dist = metadata.versions[release.version]?.dist;
  requireThat(dist?.integrity && dist.attestations?.url, 'Existing published package and provenance are required; this operation never publishes.');
  await fs.mkdir(directory, { recursive: true });
  requireThat((await fs.readdir(directory)).length === 0, 'Verification directory must be empty.');
  const source = path.join(directory, 'source');
  await fs.mkdir(source);
  const archive = path.join(directory, 'source.tar');
  command('git', ['archive', '--format=tar', `--output=${archive}`, commit]);
  command('tar', ['-xf', archive, '-C', source]);
  const file = path.join(directory, 'published.tgz');
  await fs.writeFile(file, await get(dist.tarball, false));
  const actual = await verifyPackage(file, source);
  requireThat(actual.version === release.version && actual.integrity === dist.integrity, 'Published bytes do not match the tagged source or registry integrity.');
  const attestations = await get(dist.attestations.url);
  requireThat(attestations.attestations?.some(item => item.predicateType === 'https://slsa.dev/provenance/v1'), 'Published SLSA provenance is required.');
  const after = checkOnly ? metadata : await synchronize(release.version, actual.integrity);
  const result = { ...release, ...actual, operation: checkOnly ? 'check-tags' : 'sync-tags', distTags: after['dist-tags'], provenance: dist.attestations.url };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `Tag ${checkOnly ? 'preflight' : 'synchronization'}: ${release.version}\n\n${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, directory] = process.argv.slice(2);
    requireThat(directory && path.isAbsolute(directory), 'An absolute artifact directory is required.');
    if (operation === 'prepare') await prepare(directory);
    else if (operation === 'publish' || operation === 'verify') await publish(directory, operation === 'verify');
    else if (operation === 'sync-tags' || operation === 'check-tags') await synchronizeExisting(directory, operation === 'check-tags');
    else throw new Error('Use prepare, publish, verify, check-tags or sync-tags.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
