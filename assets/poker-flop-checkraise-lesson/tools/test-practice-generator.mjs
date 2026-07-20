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
assert.equal(typeof generator.isStrongTwoOvercards, "function");
assert.equal(typeof generator.isTopPairOrBetter, "function");
assert.equal(typeof continuation.validateContinuation, "function");
assert.equal(generator.isStrongTwoOvercards({ heroCards: ["Ac", "Kd"], boardCards: ["Td", "6s", "2h"] }), true);
assert.equal(generator.isStrongTwoOvercards({ heroCards: ["Qd", "4c"], boardCards: ["Kc", "8h", "2s"] }), false);
assert.equal(generator.isStrongTwoOvercards({ heroCards: ["Jh", "5h"], boardCards: ["Kc", "8h", "2s"] }), false);
assert.equal(generator.isTopPairOrBetter(["Ts", "Jc"], ["7h", "5d", "2c", "Td"]), true);
assert.equal(generator.isTopPairOrBetter(["Ts", "Jc"], ["7h", "5d", "2c", "Td", "Jd"]), true);
assert.equal(
  generator.isTopPairOrBetter(["As", "Qc"], ["7h", "7d", "2c", "Td"]),
  false,
  "a paired board alone is not an automatic value bet"
);

const deterministicLeft = generator.createSession({ seed: "same-seed" });
const deterministicRight = generator.createSession({ seed: "same-seed" });
const leftSignatures = Array.from({ length: 64 }, () => deterministicLeft.next().practiceMeta.signature);
const rightSignatures = Array.from({ length: 64 }, () => deterministicRight.next().practiceMeta.signature);
assert.deepEqual(leftSignatures, rightSignatures, "the same seed reproduces the same practice sequence");

deterministicLeft.reset();
assert.equal(deterministicLeft.seenCount(), 0);
assert.equal(deterministicLeft.next().practiceMeta.signature, leftSignatures[0], "reset returns to the seeded sequence start");

const gutshotReproSession = generator.createSession({ seed: "diagnose-86s-k95" });
let gutshotRepro = null;
while (!gutshotRepro || gutshotRepro.practiceMeta.serial < 18) gutshotRepro = gutshotReproSession.next();
assert.deepEqual(Array.from(gutshotRepro.table.heroCards), ["8c", "6c"]);
assert.deepEqual(Array.from(gutshotRepro.table.boardCards), ["9h", "5d", "Ks"]);
assert.equal(gutshotRepro.table.pot, "5.5 BB");
assert.equal(gutshotRepro.table.toCall, 2.8);
assert.equal(gutshotRepro.practiceMeta.archetype, "thin-gutshot");
assert.equal(gutshotRepro.practiceMeta.baselineAction, "call", "86s on K95r continues at least through a call");
assert.equal(gutshotRepro.options.find((option) => option.key === "fold")?.outcome, "wrong", "the gutshot is never graded as a fold");
assert.equal(gutshotRepro.options.find((option) => option.key === "call")?.correct, true, "call is the baseline");
assert.equal(gutshotRepro.options.find((option) => option.key === "checkraise")?.acceptableMix, true, "check-raise is an accepted mix");
assert.equal(gutshotRepro.options.find((option) => option.key === "checkraise")?.outcome, "mix-xr");
assert.match(gutshotRepro.options.find((option) => option.key === "checkraise")?.feedback || "", /тоже ок/i);

const kqJ72Session = generator.createSession({ seed: "kq-j72-btnshot-1653" });
let kqJ72 = null;
while (!kqJ72 || kqJ72.practiceMeta.serial < 58) kqJ72 = kqJ72Session.next();
assert.deepEqual(Array.from(kqJ72.table.heroCards), ["Kc", "Qs"]);
assert.deepEqual(Array.from(kqJ72.table.boardCards), ["Js", "7d", "2h"]);
assert.equal(kqJ72.table.heroStack, "25 BB");
assert.equal(kqJ72.table.pot, "5.5 BB");
assert.equal(kqJ72.table.toCall, 2.2);
assert.deepEqual(Array.from(kqJ72.table.actionLine), ["BB check", "BTN bet 2.2 BB"]);
assert.equal(kqJ72.practiceMeta.archetype, "call-strong-overcards");
assert.equal(kqJ72.practiceMeta.baselineAction, "call", "KQ on J72r continues through a call");
assert.equal(kqJ72.options.find((option) => option.key === "fold")?.outcome, "wrong");
assert.equal(kqJ72.options.find((option) => option.key === "call")?.correct, true);
assert.equal(kqJ72.options.find((option) => option.key === "checkraise")?.acceptableMix, true);
assert.equal(kqJ72.options.find((option) => option.key === "checkraise")?.acceptableExploit, undefined);
assert.equal(kqJ72.options.find((option) => option.key === "checkraise")?.outcome, "mix-xr");
assert.match(kqJ72.options.find((option) => option.key === "checkraise")?.feedback || "", /KK.*QQ.*KJ.*QJ/i);
assert.match(kqJ72.options.find((option) => option.key === "checkraise")?.feedback || "", /эквити/i);
assert.match(kqJ72.options.find((option) => option.key === "checkraise")?.feedback || "", /бэкдор/i);

function rngForShuffledPrefix(cards, prefix) {
  assert.equal(new Set(prefix).size, prefix.length, "forced runout cards must be unique");
  assert(prefix.every((card) => cards.includes(card)), "forced runout cards must remain in the deck");
  const target = [...prefix, ...cards.filter((card) => !prefix.includes(card))];
  const working = cards.slice();
  const draws = [];

  for (let index = working.length - 1; index > 0; index -= 1) {
    const swap = working.indexOf(target[index]);
    assert(swap >= 0 && swap <= index, `cannot place ${target[index]} at shuffled index ${index}`);
    draws.push((swap + 0.25) / (index + 1));
    [working[index], working[swap]] = [working[swap], working[index]];
  }
  assert.deepEqual(working, target, "crafted Fisher-Yates draws reproduce the exact requested runout");

  let cursor = 0;
  return () => draws[cursor++] ?? 0;
}

const exactValueRunoutContext = {
  archetype: { id: "call-middle-pair", family: "call" },
  heroCards: ["8s", "5h"],
  boardCards: ["7h", "5d", "2c"],
  villain: "BTN",
  stack: 35,
  pot: 5.5,
  bet: 2.2,
  raiseTo: 6.6,
  foldRead: { pct: 49 },
  baselineAction: "call"
};
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const suits = ["c", "d", "h", "s"];
const exactValueRunoutDeck = ranks
  .flatMap((rank) => suits.map((suit) => `${rank}${suit}`))
  .filter((card) => ![...exactValueRunoutContext.heroCards, ...exactValueRunoutContext.boardCards].includes(card));
const exactValueRunout = generator.buildContinuation(
  exactValueRunoutContext,
  rngForShuffledPrefix(exactValueRunoutDeck, ["Ts", "Jc", "Td", "Jd"])
);
const exactValueNodes = exactValueRunout.continuation.nodes;
const exactValueValidation = continuation.validateContinuation({ continuation: exactValueRunout.continuation, options: [] });
assert.equal(exactValueValidation.ok, true, exactValueValidation.errors.join("; "));

assert.deepEqual(Array.from(exactValueRunoutContext.villainCards), ["Ts", "Jc"]);
assert.equal(exactValueRunoutContext.turnCard, "Td");
assert.equal(exactValueRunoutContext.riverCard, "Jd");

const turnCheck = exactValueNodes["turn-after-call"].options.find((option) => option.key === "check");
assert.equal(turnCheck.next, "turn-call-facing-bet", "BTN value-bets top pair after Hero checks the turn");
const turnFacingBet = exactValueNodes[turnCheck.next];
assert.equal(turnFacingBet.table.pot, "9.9 BB");
assert.equal(turnFacingBet.table.heroStack, "32.8 BB");
assert.equal(turnFacingBet.table.toCall, 5.9);
assert.equal(turnFacingBet.table.currentBet, 5.9);
assert.deepEqual(Array.from(turnFacingBet.table.actionLine), ["BB check", "BTN bet 5.9 BB"]);

const turnCall = turnFacingBet.options.find((option) => option.key === "call");
assert.equal(turnCall.correct, true, "Hero's flopped pair continues against the turn value bet");
assert.equal(turnCall.next, "river-call-after-turn-bet");
const riverAfterTurnCall = exactValueNodes[turnCall.next];
assert.equal(riverAfterTurnCall.table.pot, "21.7 BB");
assert.equal(riverAfterTurnCall.table.heroStack, "26.9 BB");

const riverCheck = riverAfterTurnCall.options.find((option) => option.key === "check");
assert.equal(
  riverCheck.next,
  "river-call-facing-bet-after-turn-bet",
  "BTN value-bets two pair after Hero checks the river"
);
const riverFacingBet = exactValueNodes[riverCheck.next];
assert.equal(riverFacingBet.table.pot, "21.7 BB");
assert.equal(riverFacingBet.table.heroStack, "26.9 BB");
assert.equal(riverFacingBet.table.toCall, 14.1);
assert.equal(riverFacingBet.table.currentBet, 14.1);
assert.deepEqual(Array.from(riverFacingBet.table.actionLine), ["BB check", "BTN bet 14.1 BB"]);

const session = generator.createSession({ seed: 20260716 });
const signatures = new Set();
const visibleSignatures = new Set();
const categoryCounts = { checkraise: 0, call: 0, fold: 0 };
const verdicts = new Set();
let previousFamily = "";
let familyStreak = 0;
let strongOvercardsSeen = 0;
let akOnT62Seen = false;

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
  } else if (checkraise.acceptableMix === true) {
    assert.equal(expected.key, "call", `${spot.id}: every accepted X/R mix keeps call as the baseline`);
    assert.equal(spot.options.find((option) => option.key === "fold").outcome, "wrong");
    assert.equal(checkraise.acceptableMix, true, `${spot.id}: the X/R is an accepted mix`);
    assert.equal(checkraise.acceptableExploit, undefined, `${spot.id}: the mix is not mislabeled as a loose exploit`);
    assert.equal(checkraise.outcome, "mix-xr");
  } else {
    assert.equal(checkraise.acceptableExploit, true, `${spot.id}: off-baseline X/R is explicitly yellow`);
    assert.equal(checkraise.outcome, "loose-xr");
  }
  if (expected.key === "fold") {
    assert.equal(generator.evaluateBest(rootCards).category, 0, `${spot.id}: a fold baseline cannot already have a made pair or better`);
  }
  if (generator.isStrongTwoOvercards(spot.table)) {
    strongOvercardsSeen += 1;
    const boardRanks = spot.table.boardCards.map((card) => "23456789TJQKA".indexOf(card[0]));
    assert.equal(expected.key, "call", `${spot.id}: two strong overcards continue through a call`);
    assert(Number.parseFloat(spot.table.toCall) / Number.parseFloat(spot.table.pot) <= 0.51, `${spot.id}: the category never faces more than a half-pot bet`);
    if (
      spot.table.heroCards.map((card) => card[0]).sort().join("") === "AK"
      && boardRanks.slice().sort((left, right) => right - left).map((rank) => "23456789TJQKA"[rank]).join("") === "T62"
    ) {
      akOnT62Seen = true;
    }
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
assert(strongOvercardsSeen > 50, "strong two-overcard calls remain a recurring procedural category");
assert.equal(akOnT62Seen, true, "AK on T62 rainbow is graded as a call rather than a fold");
assert(categoryCounts.checkraise > 300 && categoryCounts.call > 250 && categoryCounts.fold > 250, "all baseline actions remain well represented");
assert.deepEqual(
  Array.from(verdicts).sort(),
  ["correct", "loose-xr", "missed-xr", "mix-xr", "wrong", "xr-ok"].sort(),
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
