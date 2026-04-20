"use strict";

/**
 * Minimal `uuid` replacement for next-auth/jwt on runtimes where `crypto.randomFillSync`
 * (used by the real `uuid` package) is unavailable — e.g. Cloudflare Workers.
 * Exports `v4` and `default` the same way `require('uuid')` does for CJS interop.
 */
const hex = Array.from({length: 256}, (_, i) => (i + 0x100).toString(16).slice(1));

function v4() {
  const u = new Uint8Array(16);
  globalThis.crypto.getRandomValues(u);
  u[6] = (u[6] & 0x0f) | 0x40;
  u[8] = (u[8] & 0x3f) | 0x80;
  return hex[u[0]] + hex[u[1]] + hex[u[2]] + hex[u[3]] + "-" + hex[u[4]] + hex[u[5]] + "-" + hex[u[6]] + hex[u[7]] + "-" + hex[u[8]] + hex[u[9]] + "-" + hex[u[10]] + hex[u[11]] + hex[u[12]] + hex[u[13]] + hex[u[14]] + hex[u[15]];
}

module.exports = v4;
module.exports.v4 = v4;
module.exports.default = v4;
