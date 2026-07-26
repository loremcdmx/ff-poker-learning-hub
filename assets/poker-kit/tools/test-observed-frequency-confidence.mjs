#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const confidence = require("../observed-frequency-confidence.js");

assert.equal(confidence.MIN_EXACT_DENOMINATOR, 50, "one shared minimum controls exact observed frequencies");

for (const denominator of [1, 2, 34, 38, 49]) {
  assert.equal(confidence.canRenderExact(denominator), false, `N=${denominator} stays unavailable`);
  assert.equal(confidence.rate(1, denominator), null, `N=${denominator} cannot produce an exact percentage`);
}

for (const denominator of [50, 51]) {
  assert.equal(confidence.canRenderExact(denominator), true, `N=${denominator} can render an exact percentage`);
}

assert.equal(confidence.rate(25, 50), 50, "the threshold denominator renders its exact counter rate");
assert.equal(confidence.rate(26, 51), 26 / 51 * 100, "the first denominator above the threshold remains unsmoothed");
assert.equal(confidence.rate(51, 50), null, "a numerator cannot exceed its denominator");
assert.equal(confidence.rate(1.5, 50), null, "fractional pseudo-counters are rejected");
assert.equal(confidence.rate(25, 50.5), null, "fractional denominators are rejected");
assert.equal(confidence.canRenderExact("50"), true, "integer counters serialized as text remain valid");
assert.equal(confidence.canRenderExact(null), false, "missing denominators fail closed");

console.log("observed frequency confidence contract: ok");
