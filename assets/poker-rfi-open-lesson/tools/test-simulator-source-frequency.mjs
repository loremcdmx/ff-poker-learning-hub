import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const lessonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = {
  URLSearchParams,
  window: {
    location: { search: "" },
  },
};
vm.runInNewContext(fs.readFileSync(path.join(lessonRoot, "data.js"), "utf8"), context);
vm.runInNewContext(fs.readFileSync(path.join(lessonRoot, "simulator-pack.js"), "utf8"), context);

const data = context.window.PokerRfiData;
const pack = context.window.PokerRfiOpenSimulatorPack;

assert.equal(data.sourceFrequencies.EP.K7s, 80, "fixture retains the printed 80% EP weight");
assert.equal(data.frequencies.EP.K7s, 100, "the 80% source cell is binary-open");
assert.equal(pack.decisionForFrequency(data.frequencies.EP.K7s), "open", "grading uses the binary open cell");
assert.equal(pack.sourceFrequency("EP", "K7s"), 80, "display reads the printed 80% source value");
assert.ok(
  pack.reviewChart({ position: "EP", combo: "K7s", correct: true })
    .includes("K7s: рейз 2 BB; исходная частота 80%"),
  "the open review cell explains the printed 80% source value",
);

assert.equal(data.sourceFrequencies.MP.A9o, 50, "fixture retains the printed 50% MP weight");
assert.equal(data.frequencies.MP.A9o, 0, "the 50% source cell is binary-fold");
assert.equal(pack.decisionForFrequency(data.frequencies.MP.A9o), "fold", "grading uses the binary fold cell");
assert.equal(pack.sourceFrequency("MP", "A9o"), 50, "display reads the printed 50% source value");
assert.ok(
  pack.reviewChart({ position: "MP", combo: "A9o", correct: true })
    .includes("A9o: пас; исходная частота 50%"),
  "the fold review cell explains the printed 50% source value",
);

console.log("RFI simulator source-frequency review: ok");
