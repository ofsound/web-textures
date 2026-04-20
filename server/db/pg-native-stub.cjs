"use strict";

/**
 * `pg` optionally loads `pg-native` for libpq bindings. Nitro's Cloudflare bundle
 * must resolve that id, but we only use the pure-JavaScript client (`Pool` from `pg`).
 * This stub satisfies static analysis; it is only constructed if native mode is used.
 */
module.exports = function PgNativeStub() {
  throw new Error("pg-native is not available in this environment. Use the JavaScript PostgreSQL client (default Pool/Client).");
};
