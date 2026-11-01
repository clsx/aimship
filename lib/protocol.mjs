// Change this when state, approval, or stage semantics become incompatible.
export const PROTOCOL_VERSION = 1;
// Historical facts remain fixed when PROTOCOL_VERSION advances.
const legacy = new Map([['0.1.0-preview.17', 1], ['0.1.0-preview.18', 1]]);

export function packageProtocol(pkg) {
  if (Object.hasOwn(pkg, 'aimship')) return Number.isSafeInteger(pkg.aimship?.protocolVersion) && pkg.aimship.protocolVersion > 0 ? pkg.aimship.protocolVersion : null;
  return legacy.get(pkg.version) ?? null;
}

export function stateProtocol(state) {
  // A known protocol never substitutes for validating its schema and policies.
  if (state.schemaVersion !== 4 || state.reviewPolicy !== 1 || state.deliveryPolicy?.version !== 1) return null;
  if (Object.hasOwn(state, 'protocolVersion')) return state.protocolVersion;
  return legacy.get(state.rulesVersion) ?? null;
}

export function upgradeCompatibility(from, to) {
  const fromProtocol = from ? packageProtocol(from) : null, toProtocol = packageProtocol(to);
  let status = 'compatible';
  if (from && from.version !== to.version) {
    if (fromProtocol === null || toProtocol === null) status = 'unverified';
    // Legacy tools still demand exact software versions, even for protocol 1.
    else if (!to.aimship || fromProtocol !== toProtocol) status = 'breaking';
  }
  return { status, fromProtocol, toProtocol };
}
