import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const [html, source, research] = await Promise.all([
  readFile(path.join(root, "vs-3bet-defense-lesson.html"), "utf8"),
  readFile(path.join(root, "assets/poker-vs-3bet-defense-lesson/data.js"), "utf8"),
  readFile(path.join(root, "assets/poker-vs-3bet-defense-lesson/research/README.md"), "utf8")
]);

const context = { window: {} };
vm.runInNewContext(source, context, { filename: "poker-vs-3bet-defense-lesson/data.js" });
const data = context.window.FF_POKER_FIELD_LESSON_DATA;

assert.equal(data.schemaVersion, 1);
assert.equal(data.key, "vs-3bet-defense");
assert.equal(data.wisdom.length, 3);
assert.deepEqual(Array.from(data.cohorts, (cohort) => cohort.key), ["league1", "league2", "league3", "rank15_17"]);
assert.equal(data.cohorts.slice(0, 3).reduce((sum, cohort) => sum + cohort.sample, 0), 6557996);
for (const cohort of data.cohorts) {
  const actionTotal = cohort.actions.reduce((sum, action) => sum + action.pct, 0);
  assert(Math.abs(actionTotal - 100) < 0.02, `${cohort.key} fold/call/4-bet reconciles to 100%`);
}
assert.equal(data.cohorts[0].actions[2].pct, 16.30);
assert.equal(data.cohorts[2].actions[0].pct, 59.96);
assert.equal(data.cohorts[3].sample, 861445);
assert.equal(data.cohorts[3].players, 953);
assert(data.practice.length >= 3);
assert.deepEqual(
  Array.from([data.intro, ...data.practice], (spot) => spot.table.pot),
  ["1 BB", "1 BB", "1 BB", "1 BB"],
  "preflop pot keeps only the carried BB ante; current bets render from the action line"
);
for (const spot of [data.intro, ...data.practice]) {
  assert.equal(spot.options.filter((option) => option.correct).length, 1, `${spot.id} has exactly one teaching answer`);
  assert.equal(spot.table.heroCards.length, 2, `${spot.id} has hero cards`);
}

assert.match(html, /data-intro-table/);
assert.ok(html.indexOf("simulator-snapshot.js") < html.indexOf("poker-vs-3bet-defense-lesson/data.js"));
assert.ok(html.indexOf("poker-vs-3bet-defense-lesson/data.js") < html.indexOf("poker-field-lesson/lesson.js"));
assert.match(html, /href="\/flop-checkraise-lesson"/);
assert.match(research, /mcp_bq_80039683391746b3bc0cda01a00f1260/);
assert.match(research, /98\.4%/);

console.log("vs-3bet defense lesson contract: ok");
