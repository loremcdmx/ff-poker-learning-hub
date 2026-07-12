import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const lessonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(lessonRoot, "../..");
const htmlPath = path.join(repoRoot, "bb-call-defense-lesson.html");
const html = fs.readFileSync(htmlPath, "utf8");
const js = fs.readFileSync(path.join(lessonRoot, "lesson.js"), "utf8");

const ids = [
  "ideaScreen", "wisdomScreen", "deepScreen", "practiceScreen",
  "startLesson", "firstTable", "firstCoach", "wisdomCarouselTrack",
  "oddsSizeTabs", "rangeSizeTabs", "positionTabs", "rangeChart", "rangeFacts",
  "practiceSetup", "practiceRun", "practiceTable", "practiceCoach",
  "startPracticeSession", "exitPractice"
];

for (const id of ids) {
  assert.match(html, new RegExp('id="' + id + '"'), id);
}

const dynamicIds = new Set(["openWisdom", "restartPractice", "finishPractice"]);
for (const selector of js.matchAll(/\$\("#([A-Za-z][A-Za-z0-9_-]*)"\)/g)) {
  if (dynamicIds.has(selector[1])) continue;
  assert.match(html, new RegExp('id="' + selector[1] + '"'), selector[1]);
}

for (const src of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
  const local = src[1].split("?")[0];
  if (!local.startsWith("assets/")) continue;
  assert.ok(fs.existsSync(path.join(repoRoot, local)), local);
}

assert.equal((html.match(/data-wisdom-slide/g) || []).length, 9);
assert.match(html, /Голос тренера встроен/);
assert.match(html, /экспертная оценка, не измерение этого урока/);
assert.match(html, /маленький лишний фолд повторяется и складывается в большой лик на дистанции/);
assert.match(html + js, /Это не расчёт твоего личного EV/);
assert.match(html, /assets\/poker-bb-call-defense-lesson\/base\.css/);
assert.doesNotMatch(html, /assets\/poker-resteal-lesson/);
assert.match(js, /score === total && state\.stats\.missedCalls === 0 && state\.stats\.wideCalls === 0/);
assert.match(js, /function focusProgress\(target\)/);
assert.match(js, /target\.scrollIntoView\(\{ block: "center", inline: "nearest" \}\)/);
assert.match(js, /#openWisdom[\s\S]+focusProgress\(next\)/);
assert.match(js, /#practiceTable \[data-practice-next\][\s\S]+focusProgress\(next\)/);
assert.match(js, /function renderPracticeRangeProof\(spot\)/);
assert.match(js, /data-matrix-row/);
assert.match(js, /data-practice-next/);
assert.match(js, /document\.body\.classList\.add\("practice-is-running"\)/);
assert.match(js, /document\.body\.classList\.remove\("practice-is-running"\)/);
assert.ok(js.includes(String.raw`.replace(/\bUTG\b/g, "EP")`));
assert.ok(js.includes(String.raw`.replace(/(\d)\.(\d)(?=\s*BB)/g, "$1,$2")`));
assert.doesNotMatch(html, /<svg\b/i);
assert.doesNotMatch(js, /localStorage|FFTrainerEvents|FFPlayerProgress/);

console.log("BB call defense page contract: ok");
