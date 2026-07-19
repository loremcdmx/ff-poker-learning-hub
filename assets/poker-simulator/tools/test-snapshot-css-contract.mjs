import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const read = (path) => readFileSync(resolve(repo, path), "utf8");
const shell = read("assets/poker-trainer-shell/shell.css");
const simulatorPolish = read("assets/poker-simulator/simulator-polish.css");

assert.match(
  simulatorPolish,
  /\.table-grid\[data-count="1"\] \.seat\.seat-slot-model \.seat-position,[^{]+\{[^}]*width:\s*auto;[^}]*min-width:\s*34px;[^}]*height:\s*22px;[^}]*padding:\s*0 7px;/s,
  "single-table position pills size to their labels instead of the retired avatar disc"
);

assert.match(
  shell,
  /\.ff-shell-simulator-snapshot\.table-grid\[data-count="1"\][^{]*\.seat:not\(\.is-hero\)[^{]*\.seat-cards\.hidden-cards\s*\{[^}]*display:\s*none\s*!important/,
  "shared snapshot CSS hides only unrevealed opponent card backs"
);
assert.match(
  shell,
  /\.ff-shell-simulator-snapshot\.table-grid\[data-count="1"\][^{]*\.seat:not\(\.is-hero\)[^{]*\.seat-cards:is\(\.is-revealed, \.is-revealed-live\)\s*\{[^}]*display:\s*flex\s*!important/,
  "shared snapshot CSS displays revealed opponent cards"
);
assert.doesNotMatch(
  shell,
  /\.ff-shell-simulator-snapshot\.table-grid\[data-count="1"\][^{]*\.seat:not\(\.is-hero\)[^{]*\.seat-cards\s*\{[^}]*display:\s*none/,
  "shared snapshot CSS never hides every opponent card state"
);

for (const token of [
  "--hero-card-width: clamp(51px, 6.3cqw, 61.5px)",
  "--sim-1t-seat-w: clamp(108px, 14cqw, 126px)",
  "--sim-1t-seat-h: 46px",
  "--hero-card-pocket-y: -18px",
  "--hero-card-width: clamp(36px, 9.75cqw, 43.5px)",
  "--sim-1t-seat-w: 94px",
  "--sim-1t-seat-h: 40px"
]) {
  assert(shell.includes(token), `shared compact snapshot profile owns ${token}`);
}

const fieldLesson = read("assets/poker-field-lesson/lesson.css");
for (const token of [
  "body.flop-checkraise-lesson .lesson-table-host .ff-shell-simulator-snapshot",
  "--trainer-table-plane-height: min(430px, calc(100cqw * 9 / 16)) !important",
  "--hero-card-width: clamp(72px, 7.9vh, 76px) !important",
  "--board-card-width: clamp(45px, 5.3vh, 48px) !important",
  "--pot-y-bottom: 61.5% !important",
  "--trainer-table-plane-height: 360px !important",
  "--hero-card-width: 62px !important",
  "--board-card-width: 40px !important",
  "min-height: 490px !important",
  "--trainer-table-plane-height: 350px !important",
  "--pot-y-bottom: 64% !important"
]) {
  assert(fieldLesson.includes(token), `check-raise collision profile owns ${token}`);
}

const lessonCssFiles = [
  "assets/poker-bb-call-defense-lesson/base.css",
  "assets/poker-bb-call-defense-lesson/lesson.css",
  "assets/poker-rfi-open-lesson/lesson.css",
  "assets/poker-rfi-open-lesson/simulator-pack.css",
  "assets/poker-resteal-lesson/lesson.css",
  "assets/poker-resteal-lesson/simulator-pack.css"
];
const geometryTokens = [
  "--hero-card-width",
  "--hero-card-cap",
  "--hero-card-pocket-y",
  "--sim-1t-hero-card",
  "--sim-1t-seat-w",
  "--sim-1t-seat-h",
  "--seat-cards-",
  "--reveal-card-",
  "--mini-card-width"
];

const rfiLessonPath = "assets/poker-rfi-open-lesson/lesson.css";
const rfiLesson = read(rfiLessonPath);
const rfiHeroPocket = rfiLesson.match(
  /\.rfi-open-lesson #practiceTable \.seat\.seat-slot-model\.is-hero \.hero-cards\s*\{[\s\S]*?\n\}/
)?.[0] || "";
assert.doesNotMatch(
  rfiLesson,
  /#practiceTable \.seat\.seat-slot-model:not\(\.is-hero\)[^{]*\{[^}]*(?:--reveal-card-|--seat-cards-)/,
  "RFI practice does not replace shared opponent-card geometry"
);
assert.match(rfiHeroPocket, /\.is-hero \.hero-cards[\s\S]*?--hero-card-pocket-y:calc\(\(var\(--seat-h\)\*-\.5\) - \(var\(--hero-card-width\)\*\.425\) - var\(--seat-cards-ty,0px\)\)/);

for (const file of lessonCssFiles) {
  const source = file === rfiLessonPath ? read(file).replace(rfiHeroPocket, "") : read(file);
  for (const token of geometryTokens) {
    assert(!source.includes(token), `${file} does not own simulator geometry token ${token}`);
  }
  assert.doesNotMatch(source, /\.seat-cards\b/, `${file} does not resize or reposition simulator card containers`);
  assert.doesNotMatch(
    source,
    /\.lesson-table-host\s+\.table-shell\s*\{[^}]*(?:width|height|--seat-|--hero-card|--sim-1t-)/,
    `${file} does not redefine the shared compact table-shell geometry`
  );
  assert.doesNotMatch(
    source,
    /\.lesson-table-host[^,{]*\.seat-(?:panel|position)(?:[^,{]*)\{[^}]*(?:left|right|top|bottom|width|height|padding|transform)\s*:/,
    `${file} does not redefine compact seat coordinates or sizes`
  );
}

console.log("Snapshot CSS ownership contract: ok");
