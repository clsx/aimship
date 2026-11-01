// Only the two supported release formats participate in channel ordering.
const parts = value => {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-preview\.(0|[1-9]\d*))?$/.exec(value ?? '');
  if (!match) throw new Error(`Unsupported version in release tags: ${value}`);
  return match.slice(1).map(value => value === undefined ? null : BigInt(value));
};
export const releaseKind = version => parts(version)[3] === null ? 'stable' : 'preview';
export const publicationTag = version => releaseKind(version) === 'stable' ? 'latest' : 'preview';

export function releaseTags(metadata, version) {
  const kind = releaseKind(version);
  if (metadata?.name !== 'aimship' || !metadata.versions || !metadata['dist-tags']?.latest) throw new Error('Incomplete registry response.');
  const latestStable = releaseKind(metadata['dist-tags'].latest) === 'stable';
  // Keep the rule even if someone later moves latest away from a formal release.
  const formalPublished = latestStable || Object.keys(metadata.versions).some(v => /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v));
  return kind === 'stable' ? ['latest'] : formalPublished ? ['preview'] : ['preview', 'latest'];
}
export function assertForwardTags(metadata, version) {
  const target = parts(version);
  for (const tag of releaseTags(metadata, version)) {
    const current = metadata['dist-tags'][tag];
    if (current === undefined && tag === 'preview') continue;
    const existing = parts(current);
    for (let i = 0; i < 4; i++) {
      if (existing[i] === target[i]) continue;
      if (existing[i] === null || (target[i] !== null && existing[i] > target[i])) throw new Error(`Refusing to roll back ${tag} from ${current} to ${version}.`);
      break;
    }
  }
}
export function assertSynchronizedTags(metadata, version) {
  assertForwardTags(metadata, version);
  if (releaseTags(metadata, version).some(tag => metadata['dist-tags'][tag] !== version)) throw new Error('Release tags are not synchronized; inspect the registry.');
}
export async function syncTags(version, integrity, { read, add, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 13 }) {
  const inspect = async () => {
    const current = await read();
    assertForwardTags(current, version);
    if (current.versions[version]?.dist?.integrity !== integrity) throw new Error('Published package integrity changed or version is absent.');
    return current;
  };
  const initial = await inspect();
  for (const tag of releaseTags(initial, version)) {
    const current = await inspect();
    // A formal publication may have appeared since the initial read.
    if (!releaseTags(current, version).includes(tag) || current['dist-tags'][tag] === version) continue;
    // Never retry a write automatically: it may have succeeded despite a lost response.
    await add(version, tag);
    let visible = false;
    for (let attempt = 0; attempt < attempts; attempt++) {
      if ((await inspect())['dist-tags'][tag] === version) { visible = true; break; }
      if (attempt + 1 < attempts) await pause(5000);
    }
    if (!visible) throw new Error(`Tag ${tag} verification pending; inspect the registry before retrying.`);
  }
  const result = await inspect();
  assertSynchronizedTags(result, version);
  return result;
}
