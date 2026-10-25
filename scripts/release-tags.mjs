// Logical release ordering is deliberately limited to Aimship's stable/preview series.
const parts = value => {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-preview\.(0|[1-9]\d*))?$/.exec(value ?? '');
  if (!match) throw new Error(`Unsupported version in release tags: ${value}`);
  return match.slice(1).map(value => value === undefined ? null : BigInt(value));
};

export function assertForwardTags(metadata, version) {
  const target = parts(version);
  if (target[3] === null) throw new Error('Only preview versions can use this workflow.');
  if (metadata?.name !== 'aimship' || !metadata.versions || !metadata['dist-tags']?.latest) throw new Error('Incomplete registry response.');
  for (const tag of ['latest', 'preview']) {
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

export async function syncTags(version, integrity, { read, add, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 13 }) {
  const inspect = async () => {
    const current = await read();
    assertForwardTags(current, version);
    if (current.versions[version]?.dist?.integrity !== integrity) throw new Error('Published package integrity changed or version is absent.');
    return current;
  };
  for (const tag of ['preview', 'latest']) {
    if ((await inspect())['dist-tags'][tag] === version) continue;
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
  if (['latest', 'preview'].some(tag => result['dist-tags'][tag] !== version)) throw new Error('Tags changed during verification; inspect the registry.');
  return result;
}
