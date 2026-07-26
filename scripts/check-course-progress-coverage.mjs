import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const lessons = [
  {
    page: "rfi-open-position-lesson.html",
    sources: ["assets/poker-rfi-open-lesson/lesson.js"],
    resultKey: "ffstart_rfi-open-position"
  },
  {
    page: "sb-unopened-lesson.html",
    sources: ["assets/poker-preflop-benchmark/config.js", "assets/poker-preflop-benchmark/lesson.js"],
    resultKey: "ff_learning_sb_unopened"
  },
  {
    page: "bb-call-defense-lesson.html",
    sources: ["assets/poker-bb-call-defense-lesson/lesson.js"],
    resultKey: "ffstart_bb-call-defense"
  },
  {
    page: "vs-one-raiser-positions-lesson.html",
    sources: ["assets/poker-preflop-benchmark/config.js", "assets/poker-preflop-benchmark/lesson.js"],
    resultKey: "ff_learning_vs_one_raiser_positions"
  },
  {
    page: "vs-one-raiser-sb-lesson.html",
    sources: ["assets/poker-preflop-benchmark/config.js", "assets/poker-preflop-benchmark/lesson.js"],
    resultKey: "ff_learning_vs_one_raiser_sb"
  },
  {
    page: "resteal-lesson.html",
    sources: ["assets/poker-resteal-lesson/lesson.js"],
    resultKey: "ffstart_resteal"
  },
  {
    page: "flop-cbet-hu-lesson.html",
    sources: ["assets/poker-flop-cbet-hu-lesson/lesson.js"],
    resultKey: "ff_learning_flop_cbet_hu"
  },
  {
    page: "flop-checkraise-lesson.html",
    sources: ["assets/poker-field-lesson/lesson.js"],
    resultKey: "ff_learning_flop_checkraise"
  },
  {
    page: "vs-3bet-defense-lesson.html",
    sources: ["assets/poker-field-lesson/lesson.js"],
    resultKey: "ff_learning_vs_3bet_defense"
  }
];

assert.equal(new Set(lessons.map(({ resultKey }) => resultKey)).size, lessons.length, "each lesson has a distinct progress key");

for (const lesson of lessons) {
  const html = read(lesson.page);
  const progressScripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc="assets\/poker-progress\/progress\.js\?v=([a-f0-9]+)"[^>]*><\/script>/g));
  assert.equal(progressScripts.length, 1, `${lesson.page} loads the canonical progress client exactly once`);
  assert.match(progressScripts[0][1], /^[a-f0-9]{12}$/, `${lesson.page} cache-busts the canonical progress client`);

  const source = lesson.sources.map(read).join("\n");
  assert(source.includes(lesson.resultKey), `${lesson.page} reports the canonical key ${lesson.resultKey}`);
  assert.match(source, /FFPlayerProgress/, `${lesson.page} uses FFPlayerProgress rather than a parallel store`);
  assert.match(source, /\.setResult\(/, `${lesson.page} records completion through setResult`);
}

const cbetSource = read("assets/poker-flop-cbet-hu-lesson/lesson.js");
for (const token of [
  "targetHands: 25",
  "passScore: 80",
  "courseReported: false",
  "function reportTrainerProgress()",
  "reportTrainerProgress();"
]) {
  assert(cbetSource.includes(token), `flop c-bet progress contract keeps ${token}`);
}

const fieldSource = read("assets/poker-field-lesson/lesson.js");
for (const token of [
  '"flop-checkraise": Object.freeze({',
  '"vs-3bet-defense": Object.freeze({',
  "targetHands: 25",
  "passScore: 80",
  "courseReported: false",
  "function reportPracticeProgress()",
  "reportPracticeProgress();"
]) {
  assert(fieldSource.includes(token), `shared field progress contract keeps ${token}`);
}

console.log(`course progress coverage: ok · ${lessons.length}/${lessons.length} lessons`);
