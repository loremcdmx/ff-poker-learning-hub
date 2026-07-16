import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const repo = new URL("../../../", import.meta.url);
const html = readFileSync(new URL("flop-cbet-hu-lesson.html", repo), "utf8");
const dataSource = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/data.js", repo), "utf8");
const lessonSource = readFileSync(new URL("assets/poker-flop-cbet-hu-lesson/lesson.js", repo), "utf8");
const engineSource = readFileSync(new URL("assets/poker-kit/simulator/engine-core.js", repo), "utf8");
const settingsSource = readFileSync(new URL("assets/poker-simulator/simulator-settings.js", repo), "utf8");
const embedSource = readFileSync(new URL("assets/poker-simulator/embed.js", repo), "utf8");
const appLaunchSource = readFileSync(new URL("assets/poker-simulator/simulator-app-launch.js", repo), "utf8");
const appShellSource = readFileSync(new URL("assets/poker-simulator/simulator-app-shell-composition.js", repo), "utf8");
const simulatorHtml = readFileSync(new URL("poker-simulator.html", repo), "utf8");

const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext, { filename: "data.js" });
const data = dataContext.window.FF_FLOP_CBET_HU_DATA;

assert.ok(data, "c-bet data payload is exported");
assert.equal(data.meta.sample.percent, 70);
assert.equal(data.meta.sample.inputRows, 2300854);
assert.equal(data.meta.sample.validSpots, 2297953);
assert.equal(data.meta.sample.rankedSpots, 2256311);
assert.equal(data.meta.overallCbetIsFullPopulation, true);
assert.ok(Array.isArray(data.overallCbet) && data.overallCbet.length >= 17, "rank-level c-bet population is present");
assert.ok(data.boardExamples && Object.keys(data.boardExamples).length > 0, "real board examples are present");

for (const id of ["dealScreen", "mainScreen", "practiceScreen", "examplesScreen", "simulatorScreen"]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} exists`);
}
for (const token of [
  "data-wisdom-slide",
  "data-trainer-action=\"check\"",
  "data-board-example-library",
  "data-cbet-simulator",
  "assets/poker-simulator/embed.js",
  "assets/poker-flop-cbet-hu-lesson/data.js",
  "assets/poker-flop-cbet-hu-lesson/lesson.js",
  "href=\"/flop-checkraise-lesson\""
]) {
  assert.match(html, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), token);
}

assert.match(lessonSource, /pack:\s*"cbet-rvbb"/);
assert.match(lessonSource, /autoStart:\s*true/);
assert.match(lessonSource, /function ensureSimulator\(/);
assert.match(lessonSource, /function renderBoardExamples\(/);
assert.match(lessonSource, /function renderTrainer\(/);
assert.match(engineSource, /"cbet-rvbb":\s*\{[\s\S]*key:\s*"btn-vs-bb-cbet"[\s\S]*startStreet:\s*"flop"/);
assert.match(settingsSource, /bootPack === "cbet-rvbb"/);
assert.match(settingsSource, /settings\.postflopBetPercents = "25,33,50,67,allin"/);
assert.match(embedSource, /url\.searchParams\.set\("pack"/);
assert.match(embedSource, /url\.searchParams\.set\("autostart", "1"\)/);
assert.match(appShellSource, /bootParams:\s*appFoundation\.bootParams/);
assert.match(appLaunchSource, /const embeddedAutoStart = embeddedMode/);
assert.match(appLaunchSource, /state\.restoreTableSnapshots = \[\]/);
assert.match(appLaunchSource, /if \(embeddedAutoStart\)[\s\S]*options\.dealNextAllTables\?\.\(\)/);
assert.match(simulatorHtml, /simulator-cbet-embed\.css/);

console.log("flop c-bet lesson contract: ok");
