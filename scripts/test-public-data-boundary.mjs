#!/usr/bin/env node

import assert from "node:assert/strict";
import { validatePublicDataSource } from "./check-public-data-boundary.mjs";

const spec = {
  file: "fixture.js",
  maximumSentinelBytes: 512,
  aggregatePatterns: [/"opportunities"\s*:/, /"actions"\s*:/]
};

const methodology = 'window.Fixture={status:"methodology_only",charts:{}};\n';
assert.equal(validatePublicDataSource({ ...spec, source: methodology }), "methodology_only");

const readyAggregate = `window.Fixture={
  status:"ready",
  meta:{sourceQueryTemplateSha256:"${"a".repeat(64)}",latestKey:"hand_player_id"},
  charts:{example:{"opportunities":100,"actions":{"fold":60,"call":40}}}
};\n`;
assert.equal(validatePublicDataSource({ ...spec, source: readyAggregate }), "ready_aggregate");

for (const [label, leak] of [
  ["private path", 'meta:{privateSql:"/private/tmp/query.sql"}'],
  ["raw id", 'rows:[{"user_id":12345,"opportunities":1}]'],
  ["raw id list", 'meta:{"userIds":[101,202]}'],
  ["failed attempt log", 'meta:{failedAttempts:[{reason:"query failed"}]}'],
  ["query text", 'meta:{query:"SELECT user_id FROM analytics.int_tracker_hand_joined"}'],
  ["source cube", 'meta:{sourceCube:"resteal-rank-hand-cube.csv"}']
]) {
  assert.throws(
    () => validatePublicDataSource({
      ...spec,
      source: `window.Fixture={status:"ready",${leak},charts:{x:{"opportunities":1}}};`
    }),
    undefined,
    `${label} must fail the public-data boundary`
  );
}

assert.throws(
  () => validatePublicDataSource({
    ...spec,
    maximumSentinelBytes: 10,
    source: methodology
  }),
  /methodology sentinel is unexpectedly large/,
  "methodology-only payloads retain the small empty-sentinel contract"
);

console.log("public data boundary regression fixtures: ok");
