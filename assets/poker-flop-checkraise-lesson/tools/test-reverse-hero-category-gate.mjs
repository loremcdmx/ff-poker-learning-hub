import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const lessonRoot = path.resolve(here, "..");
const [diagnosticSource, sql, dataSource] = await Promise.all([
  readFile(path.join(lessonRoot, "research/reverse-hero-category-reconciliation.json"), "utf8"),
  readFile(path.join(lessonRoot, "research/reverse-hero-category-league-extract.sql"), "utf8"),
  readFile(path.join(lessonRoot, "data.js"), "utf8")
]);

const diagnostic = JSON.parse(diagnosticSource);
assert.equal(diagnostic.publishEligible, false);
assert.equal(diagnostic.status, "blocked_control_mismatch");
assert.match(diagnostic.blocker, /do not exactly reproduce/i);
assert.match(diagnostic.nextSafeStep, /exact rank-bridge|rebuild.*canonical controls/i);

for (const league of ["league1", "league2", "league3"]) {
  const control = diagnostic.controls[league];
  const actual = diagnostic.currentPreflight[league];
  assert(control.xraises > 0 && control.opportunities > control.xraises);
  assert(actual.xraises > 0 && actual.opportunities > actual.xraises);
  assert.notDeepEqual(
    [actual.xraises, actual.opportunities],
    [control.xraises, control.opportunities],
    `${league} remains blocked until both controls reconcile exactly`
  );
}

assert.equal(diagnostic.deltaCurrentMinusControl.allLeagues.xraises, 35);
assert.equal(diagnostic.deltaCurrentMinusControl.allLeagues.opportunities, 335);
assert.match(sql, /is_one_preflop_action_before_player\s*=\s*1/);
assert.doesNotMatch(sql, /AND\s+h\.preflop_raiser_count\s*=\s*1/);
assert.match(sql, /publish neither the[\s\S]*category rates nor an apparently close approximation/i);

assert.match(dataSource, /status:\s*"pending_exact_extract"/);
assert.doesNotMatch(dataSource, /status:\s*"published_exact_extract"/);

console.log("reverse-Hero category publication gate: blocked safely");
