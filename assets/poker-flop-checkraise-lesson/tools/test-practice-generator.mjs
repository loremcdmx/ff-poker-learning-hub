import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const [generatorSource, continuationSource] = await Promise.all([
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/practice-generator.js"), "utf8"),
  readFile(path.join(root, "assets/poker-trainer-shell/simulator-continuation.js"), "utf8")
]);

const context = { window: {} };
vm.runInNewContext(generatorSource, context, { filename: "practice-generator.js" });
vm.runInNewContext(continuationSource, context, { filename: "simulator-continuation.js" });

const generator = context.window.FFFlopCheckraisePracticeGenerator;
const continuation = context.window.FFTrainerSimulatorContinuation;
assert.equal(generator.schemaVersion, 1);
assert.equal(typeof generator.createSession, "function");
assert.equal(typeof continuation.validateContinuation, "function");

const deterministicLeft = generator.createSession({ seed: "same-seed" });
const deterministicRight = generator.createSession({ seed: "same-seed" });
const leftSignatures = Array.from({ length: 64 }, () => deterministicLeft.next().practiceMeta.signature);
const rightSignatures = Array.from({ length: 64 }, () => deterministicRight.next().practiceMeta.signature);
assert.deepEqual(leftSignatures, rightSignatures, "the same seed reproduces the same practice sequence");

deterministicLeft.reset();
assert.equal(deterministicLeft.seenCount(), 0);
assert.equal(deterministicLeft.next().practiceMeta.signature, leftSignatures[0], "reset returns to the seeded sequence start");

const session = generator.createSession({ seed: 20260716 });
const signatures = new Set();
const visibleSignatures = new Set();
const categoryCounts = { checkraise: 0, call: 0, fold: 0 };
const verdicts = new Set();
let previousFamily = "";
let familyStreak = 0;

for (let index = 0; index < 1500; index += 1) {
  const spot = session.next();
  const validation = generator.validateSpot(spot);
  assert.equal(validation.ok, true, `${spot.id}: ${validation.errors.join("; ")}`);
  assert.equal(signatures.has(spot.practiceMeta.signature), false, `${spot.id}: visible Hero+flop situation repeated`);
  signatures.add(spot.practiceMeta.signature);
  assert.equal(visibleSignatures.has(spot.practiceMeta.visibleSignature), false, `${spot.id}: visible cards repeated in the opening training run`);
  visibleSignatures.add(spot.practiceMeta.visibleSignature);

  const rootCards = [...spot.table.heroCards, ...spot.table.boardCards];
  assert.equal(rootCards.length, 5);
  assert.equal(new Set(rootCards).size, 5, `${spot.id}: root cards are unique`);
  assert(rootCards.every((card) => /^[2-9TJQKA][cdhs]$/.test(card)));
  assert.equal(spot.options.filter((option) => option.correct).length, 1, `${spot.id}: exactly one root answer`);
  assert.deepEqual(Array.from(spot.options, (option) => option.key), ["fold", "call", "checkraise"]);

  const expected = spot.options.find((option) => option.correct);
  const checkraise = spot.options.find((option) => option.key === "checkraise");
  categoryCounts[expected.key] += 1;
  spot.options.forEach((option) => verdicts.add(option.outcome));
  if (expected.key === "checkraise") {
    assert.equal(checkraise.outcome, "xr-ok");
    spot.options.filter((option) => option.key !== "checkraise").forEach((option) => {
      assert.equal(option.outcome, "missed-xr", `${spot.id}: a clear missed X/R is red`);
    });
  } else {
    assert.equal(checkraise.acceptableExploit, true, `${spot.id}: off-baseline X/R is explicitly yellow`);
    assert.equal(checkraise.outcome, "loose-xr");
  }
  if (expected.key === "fold") {
    assert.equal(generator.evaluateBest(rootCards).category, 0, `${spot.id}: a fold baseline cannot already have a made pair or better`);
  }

  familyStreak = expected.key === previousFamily ? familyStreak + 1 : 1;
  previousFamily = expected.key;
  assert(familyStreak <= 2, `${spot.id}: no baseline family appears more than twice in a row`);

  const graphValidation = continuation.validateContinuation(spot);
  assert.equal(graphValidation.ok, true, `${spot.id}: ${graphValidation.errors.join("; ")}`);
  assert.notEqual(spot.options.find((option) => option.key === "fold").next, spot.options.find((option) => option.key === "call").next);
  assert.notEqual(
    spot.continuation.nodes["turn-after-call"].options[0].next,
    spot.continuation.nodes["turn-after-call"].options[1].next,
    `${spot.id}: turn actions after call must create different river states`
  );
  assert.notEqual(
    spot.continuation.nodes["turn-after-xr-call"].options[0].next,
    spot.continuation.nodes["turn-after-xr-call"].options[1].next,
    `${spot.id}: turn actions after X/R must create different river states`
  );
  assert.notEqual(
    spot.continuation.nodes["river-call-check"].table.pot,
    spot.continuation.nodes["river-call-lead"].table.pot,
    `${spot.id}: a called turn lead changes the river pot`
  );

  const terminal = spot.continuation.nodes["showdown-call-check-check"];
  const reveal = terminal.table.seats.find((seat) => seat.revealCardsAfterAnswer);
  const fullCards = [...spot.table.heroCards, ...terminal.table.boardCards, ...reveal.cards];
  assert.equal(fullCards.length, 9);
  assert.equal(new Set(fullCards).size, 9, `${spot.id}: Hero, board and opponent cards are unique`);
  const comparison = generator.compareEvaluations(
    generator.evaluateBest([...spot.table.heroCards, ...terminal.table.boardCards]),
    generator.evaluateBest([...reveal.cards, ...terminal.table.boardCards])
  );
  assert.equal(
    terminal.result.winner,
    comparison > 0 ? "Hero" : comparison < 0 ? spot.table.actionLine[1].split(" ")[0] : "Ничья",
    `${spot.id}: declared showdown winner matches the revealed cards`
  );
}

assert.equal(signatures.size, 1500);
assert.equal(visibleSignatures.size, 1500);
assert.equal(session.seenCount(), 1500);
assert(categoryCounts.checkraise > 300 && categoryCounts.call > 250 && categoryCounts.fold > 250, "all baseline actions remain well represented");
assert.deepEqual(
  Array.from(verdicts).sort(),
  ["correct", "loose-xr", "missed-xr", "wrong", "xr-ok"].sort(),
  "green, yellow and red root verdict families are all generated"
);

const differentSeed = generator.createSession({ seed: "different-seed" });
assert.notDeepEqual(
  Array.from({ length: 20 }, () => differentSeed.next().practiceMeta.signature),
  leftSignatures.slice(0, 20),
  "different seeds produce a different visible sequence"
);

const marathon = generator.createSession({ seed: "marathon" });
const marathonSignatures = new Set();
for (let index = 0; index < 12000; index += 1) {
  const spot = marathon.next();
  assert.equal(marathonSignatures.has(spot.practiceMeta.signature), false, `marathon situation ${index} repeated`);
  marathonSignatures.add(spot.practiceMeta.signature);
}
assert.equal(marathon.seenCount(), 12000, "the procedural session keeps running well past the old finite pack");

console.log(`check-raise procedural practice: ok · ${signatures.size} unique situations`);
