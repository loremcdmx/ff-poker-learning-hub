import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const [html, source, shared, sharedCss, continuationDataSource, practiceGeneratorSource, continuationControllerSource, fieldMatrixSource, fieldMatrixCss, matrixBuilderSource] = await Promise.all([
  readFile(path.join(root, "flop-checkraise-lesson.html"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/data.js"), "utf8"),
  readFile(path.join(root, "assets/poker-field-lesson/lesson.js"), "utf8"),
  readFile(path.join(root, "assets/poker-field-lesson/lesson.css"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/continuations.js"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/practice-generator.js"), "utf8"),
  readFile(path.join(root, "assets/poker-trainer-shell/simulator-continuation.js"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/field-matrix.js"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/field-matrix.css"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/research/build-structure-league-field-matrix.py"), "utf8")
]);

const exactRows = [];
for (const [cohortIndex, cohort] of ["league1", "league2", "league3", "novice"].entries()) {
  for (const [positionIndex, position] of ["BTN", "CO"].entries()) {
    for (const [depthIndex, depthBand] of ["20-30", "30-40", "40-70", "70+"].entries()) {
      const opportunities = 100 + cohortIndex * 20 + positionIndex * 10 + depthIndex * 5;
      const raises = 18 - cohortIndex + depthIndex;
      const calls = 50 + cohortIndex * 3;
      const other = 0;
      const folds = opportunities - raises - calls - other;
      exactRows.push({
        node: "bb_response", cohort, position, depthBand,
        opportunities, checksBack: 0, cbets: 0, facedRaises: 0,
        folds, calls, raises, other, publishable: true
      });
      exactRows.push({
        node: "cbet", cohort, position, depthBand,
        opportunities, checksBack: 25, cbets: opportunities - 25, facedRaises: raises,
        folds: 0, calls: 0, raises: 0, other: 0, publishable: true
      });
    }
  }
}
const exactFixture = {
  schemaVersion: 1,
  meta: {
    rankTiming: "exact_as_of_hand",
    minimumDenominator: 50,
    windowStartInclusive: "2023-09-01",
    windowEndExclusive: "2026-07-22"
  },
  rows: exactRows
};
const sourceWithFixture = source.replace(
  /\/\* FF_FULL_HISTORY_FIELD_START \*\/[\s\S]*?\/\* FF_FULL_HISTORY_FIELD_END \*\//,
  `/* FF_FULL_HISTORY_FIELD_START */ ${JSON.stringify(exactFixture)} /* FF_FULL_HISTORY_FIELD_END */`
);
const sourceWithoutArtifact = source.replace(
  /\/\* FF_FULL_HISTORY_FIELD_START \*\/[\s\S]*?\/\* FF_FULL_HISTORY_FIELD_END \*\//,
  "/* FF_FULL_HISTORY_FIELD_START */ null /* FF_FULL_HISTORY_FIELD_END */"
);

const context = { window: {} };
vm.runInNewContext(continuationDataSource, context, { filename: "poker-flop-checkraise-lesson/continuations.js" });
vm.runInNewContext(practiceGeneratorSource, context, { filename: "poker-flop-checkraise-lesson/practice-generator.js" });
vm.runInNewContext(sourceWithFixture, context, { filename: "poker-flop-checkraise-lesson/data.js" });
const data = context.window.FF_POKER_FIELD_LESSON_DATA;
const emptyContext = { window: {} };
vm.runInNewContext(continuationDataSource, emptyContext, { filename: "poker-flop-checkraise-lesson/continuations.js" });
vm.runInNewContext(practiceGeneratorSource, emptyContext, { filename: "poker-flop-checkraise-lesson/practice-generator.js" });
vm.runInNewContext(sourceWithoutArtifact, emptyContext, { filename: "poker-flop-checkraise-lesson/data.js" });
assert(emptyContext.window.FF_POKER_FIELD_LESSON_DATA.cohorts.every((cohort) => cohort.actions.every((action) => action.pct === null)), "a missing exact artifact fails closed instead of displaying fake zero rates");
const confidenceSource = await readFile(path.join(root, "assets/poker-kit/observed-frequency-confidence.js"), "utf8");

assert.equal(data.schemaVersion, 1);
assert.equal(data.key, "flop-checkraise");
const introSeats = Array.from(data.intro.table.seats);
const introSeat = (label) => introSeats.find((seat) => seat.label === label);
const introStartingChips = introSeats.reduce((sum, seat) => sum + Number(seat.startingStackBb), 0);
const introFlopChips = introSeats.reduce((sum, seat) => sum + Number(seat.stackBb), 0)
  + Number.parseFloat(data.intro.table.pot);
assert.equal(introStartingChips, 6 * 40, "the intro declares the real 40 BB hand-start stacks");
assert(Math.abs(introFlopChips - introStartingChips) < 0.001, "preflop contributions move from stacks into the pot exactly once");
assert.equal(introSeat("BB").stackBb, 36.8);
assert.equal(introSeat("BTN").stackBb, 37.8);
assert.equal(introSeat("SB").stackBb, 39.5);
assert.equal(data.intro.table.heroStack, "36.8 BB");
assert.equal(data.wisdom.length, 3);
assert.equal(data.wisdom[1].rule, undefined, "the second wisdom slide has no extra rule callout");
assert.equal(data.wisdom[2].rule, undefined, "the third wisdom slide has no extra rule callout");
assert.equal(data.wisdom[2].title, "Оценивай весь узел");
assert.match(data.wisdom[2].copy, /пас[а-я]* и колл[а-я]*/i);
assert.equal(data.wisdom[2].visual, undefined, "the full-history wisdom does not claim unsupported board-level field evidence");
const valueVisual = data.wisdom[1].visual;
assert.equal(data.wisdom[1].title, "Рейзим не только блефы");
assert.match(data.wisdom[1].copy, /вэлью-часть/);
assert.doesNotMatch(
  shared,
  /\.replace\(\/A-high|\.replace\(\/K-high|\.replace\(\/Вэлью|\.replace\(\/X\\\/R|\.replace\(\/top-pair|\.replace\(\/showdown/,
  "shared renderer does not rewrite authored poker copy with regexes"
);
assert.equal(data.wisdom[1].visual.boardLabel, "Король-хай · сухая · K92r");
assert.equal(data.examples.boardAtlas.structures[0].label, "Туз-хай · сухая");
assert.equal(data.examples.boardAtlas.structures[1].label, "Король-хай · сухая");
assert.equal(data.examples.boardAtlas.structures[4].label, "Спаренная / трипс");
const learnerCopyFields = [];
const technicalCopyKeys = new Set(["id", "key", "roleKey", "sourceSpotId", "sourceSpotIds", "actionKey", "tone", "categoryKey", "continuation"]);
function collectLearnerCopy(value, key = "") {
  if (technicalCopyKeys.has(key)) return;
  if (typeof value === "string") learnerCopyFields.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectLearnerCopy(item));
  else if (value && typeof value === "object") Object.entries(value).forEach(([childKey, item]) => collectLearnerCopy(item, childKey));
}
collectLearnerCopy(data);
assert.doesNotMatch(
  learnerCopyFields.join("\n"),
  /A-high|K-high|\btrips\b|\bdry\b|Велью|велью|X\/R|top-pair|showdown|check-raise|check-call|backdoor|straight|runner-runner|\bFold\b|\bCall\b|\bequity\b|\bmade hand\b|\bgive-up\b/i,
  "learner-facing check-raise copy is authored once in consistent Russian"
);
assert.doesNotMatch(
  [html, shared, practiceGeneratorSource].join("\n"),
  /Велью|велью/,
  "HTML, shared renderer and procedural feedback use one authored вэлью spelling"
);
assert.equal(valueVisual.type, "value-range");
assert.deepEqual(Array.from(valueVisual.boardCards), ["Kc", "9d", "2h"]);
assert.deepEqual(Array.from(valueVisual.groups, (group) => group.key), ["strong", "thin"]);
assert.deepEqual(
  Array.from(valueVisual.groups, (group) => Array.from(group.hands, (hand) => hand.label)).flat(),
  ["K9", "K2", "92s", "22", "99", "KQ", "KJ", "KT"],
  "the K92 lesson names the complete requested value range"
);
assert.equal(
  Array.from(valueVisual.groups, (group) => Array.from(group.hands, (hand) => Array.from(hand.cards))).flat(2).length,
  16,
  "all eight hand classes render as real two-card PokerDeckKit examples"
);
assert.match(valueVisual.note, /Кикеры Q, J и T.*бродвейных баррелей/i);
assert.match(shared, /function wisdomValueRange\(item\)/, "the shared renderer supports the K92 value panel");
assert.match(shared, /function wisdomValueCopy\(item\)/, "the shared renderer supports formatted K92 copy");
assert.match(shared, /evidenceStatus === "methodology_only"/, "methodology-only examples are a first-class shared contract");
assert.match(shared, /methodologyOnly = cleanText\(rawData\?\.status\) === "methodology_only"/, "methodology-only field payloads may omit unverified percentages");
assert.match(sharedCss, /\.wisdom-value-range\s*\{/);
assert.match(sharedCss, /\.wisdom-value-combo\s*\{/);

const field = data.fullHistory;
assert.equal(data.status, "ready", "an injected exact artifact switches the field payload to ready");
assert.equal(field.schemaVersion, 1);
assert.deepEqual(
  Object.fromEntries(Object.entries(field.meta)),
  {
    rankTiming: "exact_as_of_hand",
    minimumDenominator: 50,
    windowStartInclusive: "2023-09-01",
    windowEndExclusive: "2026-07-22"
  }
);
assert.equal(field.rows.length, 64, "the fixture covers both exact nodes, four cohorts, two openers and four stack bands");
const responseRows = field.rows.filter((row) => row.node === "bb_response");
assert.equal(responseRows.length, 32);
for (const row of responseRows) {
  assert.equal(row.folds + row.calls + row.raises + row.other, row.opportunities);
  assert.equal(row.publishable, row.opportunities >= 50);
}
assert.deepEqual(Array.from(data.cohorts, (cohort) => cohort.key), ["league1", "league2", "league3", "novice"]);
assert(data.cohorts.every((cohort) => cohort.display === "mix"));
for (const cohort of data.cohorts) {
  assert.deepEqual(Array.from(cohort.actions, (action) => action.key), ["fold", "call", "checkraise"]);
  assert(Math.abs(cohort.actions.reduce((sum, action) => sum + action.pct, 0) - 100) < 1e-9);
  assert(cohort.sample >= 50);
}
assert.match(data.meta.sampleNote, /сыгранные решения/i);
assert.match(data.meta.sampleNote, /не solver-чарт/i);
assert.match(data.meta.sampleNote, /N ≥ 50.*срезы скрываются/i);
assert.match(emptyContext.window.FF_POKER_FIELD_LESSON_DATA.meta.sampleNote, /полнота истории ещё проверяется.*Проценты скрыты/i);
assert.doesNotMatch(emptyContext.window.FF_POKER_FIELD_LESSON_DATA.meta.sampleNote, /hand_player_id|latest|manifest|candidate|raw-HH|N\s*[≥>]/i);
assert.doesNotMatch(emptyContext.window.FF_POKER_FIELD_LESSON_DATA.meta.sourceLabel, /полная история/i);
assert.doesNotMatch(source, /Q2 2026|2026-Q2|deterministic_hh_sample|pending_exact_extract|observedLeague1/);
assert.doesNotMatch(source, /fieldMatrix\s*:/, "the sampled board matrix is absent from browser data");
assert.match(fieldMatrixSource, /const source = lessonData\?\.fullHistory/);
assert.match(fieldMatrixSource, /const methodologyOnly = lessonData\?\.status === "methodology_only" && !source/);
assert.match(fieldMatrixSource, /function renderPending\(\)/);
assert.match(
  fieldMatrixSource,
  /const ready = !methodologyOnly && matrixErrors\(source\)\.length === 0[\s\S]*fieldTab\.hidden = !ready[\s\S]*fieldLink\.hidden = !ready/,
  "the exact full-history matrix exposes its tab and CTA only after the full runtime validation passes"
);
assert.match(fieldMatrixSource, /const COHORTS = \[[\s\S]*league1[\s\S]*league2[\s\S]*league3[\s\S]*novice/);
assert.match(fieldMatrixSource, /folds \+ calls \+ raises \+ other !== opportunities/);
assert.match(fieldMatrixSource, /row\.publishable !== \(opportunities >= 50\)/);
assert.match(fieldMatrixSource, /const POSITIONS = \["BTN", "CO"\]/);
assert.match(fieldMatrixSource, /const DEPTHS = \["20-30", "30-40", "40-70", "70\+"\]/);
assert.doesNotMatch(fieldMatrixSource, /STRUCTURE_KEYS|foldViews|Q2 2026/);
assert.match(fieldMatrixCss, /structure-response-bar[\s\S]*is-fold[\s\S]*is-call[\s\S]*is-raise/);
assert.match(fieldMatrixCss, /example-observed\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(matrixBuilderSource, /LEAGUES = \("league1", "league2", "league3", "novice"\)/, "Q2 research cohorts stay disjoint through R18");
assert.match(matrixBuilderSource, /"league3": "R11-14"[\s\S]*"novice": "R15-18"/);
assert.match(matrixBuilderSource, /--size-matched-output[\s\S]*size_matched_k_high_rows/, "the size-matched card is derived in the same matrix pass");
assert.match(matrixBuilderSource, /legacy residue-export helper is not a release source/i);
assert.doesNotMatch(matrixBuilderSource, /EXPECTED_Q2_CONTROLS|--verify-q2-controls|2_300_854|2_256_311/, "stale sampled-Q2 counters cannot masquerade as a current release gate");

assert.equal(data.practice.length, 23, "one canonical practice catalog feeds all modes");
const byId = new Map(data.practice.map((spot) => [spot.id, spot]));
assert.equal(byId.size, data.practice.length, "practice spot IDs are unique");
assert.equal(data.intro.id, "xr-t9-backdoors");
assert.equal(data.intro, byId.get(data.intro.id), "intro reuses the canonical practice spot");
assert(data.intro.continuation, "the first T9hh practice spot exposes the full-hand continuation");
assert.equal(data.intro.continuation.start, "turn-jh-decision");
assert.equal(Object.values(data.intro.continuation.nodes).filter((node) => node.terminal).length, 4);
assert.deepEqual(
  Array.from(data.intro.continuation.nodes["turn-jh-decision"].table.boardCards),
  ["Kc", "8h", "2s", "Jh"]
);
for (const terminal of Object.values(data.intro.continuation.nodes).filter((node) => node.terminal)) {
  const reveal = terminal.table.seats.find((seat) => seat.revealCardsAfterAnswer);
  assert.deepEqual(Array.from(reveal.cards), ["Kd", "Ks"]);
  assert.match(terminal.result.summary, /Hero T♥ 9♥: стрит-флеш до дамы.*BTN K♦ K♠: сет королей/i);
}
assert.equal(byId.get("xr-97-double-backdoor").continuation, undefined, "continuation is explicit, never synthesized");

for (const spot of data.practice) {
  assert.equal(spot.table.heroPosition, "BB", `${spot.id} keeps Hero in BB`);
  assert.match(spot.table.historyLine, /^(CO|BTN) открывает .* BB коллирует/i, `${spot.id} stays in BB-vs-late-RFI`);
  assert.equal(spot.table.actionLine[0], "BB check", `${spot.id} starts the flop node with BB check`);
  assert.match(spot.table.actionLine[1], /^(CO|BTN) bet /, `${spot.id} faces the late aggressor c-bet`);
  assert.equal(spot.options.length, 3, `${spot.id} offers fold/call/check-raise only`);
  assert.deepEqual(Array.from(spot.options, (option) => option.key), ["fold", "call", "checkraise"]);
  assert.equal(spot.options.filter((option) => option.correct).length, 1, `${spot.id} has one teaching answer`);
  const checkraise = spot.options.find((option) => option.key === "checkraise");
  assert.equal(
    checkraise.acceptableExploit,
    checkraise.correct ? undefined : true,
    `${spot.id} marks only an off-baseline X/R as an acceptable exploit`
  );
  const cards = [...spot.table.heroCards, ...spot.table.boardCards];
  assert.equal(new Set(cards).size, cards.length, `${spot.id} has no duplicate cards`);
  const liveSeats = spot.table.seats.filter((seat) => seat.state !== "folded");
  assert.deepEqual(Array.from(liveSeats, (seat) => seat.label), [spot.table.actionLine[1].split(" ")[0], "BB"].sort((a, b) => ["UTG", "HJ", "CO", "BTN", "SB", "BB"].indexOf(a) - ["UTG", "HJ", "CO", "BTN", "SB", "BB"].indexOf(b)), `${spot.id} renders a real heads-up table`);
  assert.equal(spot.table.seats.filter((seat) => seat.state === "folded").length, 4, `${spot.id} folds every bystander seat`);
}

assert.equal(data.practiceModes, undefined, "the practice screen no longer exposes a finite pack filter");
assert.deepEqual(
  Object.fromEntries(Object.entries(data.practiceGenerator)),
  { schemaVersion: 1, global: "FFFlopCheckraisePracticeGenerator", defaultDepth: "flop" },
  "practice resolves the procedural browser provider"
);
assert.equal(typeof context.window.FFFlopCheckraisePracticeGenerator?.createSession, "function");
assert.deepEqual(
  Object.fromEntries(Object.entries(data.practicePresentation)),
  { autoStart: true, compactFeedback: true, externalControls: true },
  "check-raise practice opts into the immediate c-bet-style loop"
);
assert.match(byId.get("xr-22-set").question, /2♣2♠/, "displayed pocket deuces match the table cards");
assert.match(byId.get("xr-22-set").title, /K92hh/, "the two-tone K-heart board is not mislabeled as rainbow");
assert.doesNotMatch(data.intro.title, /как кандидат/i, "the intro title does not reveal the teaching answer");
assert.doesNotMatch(shared, /formatCount\(folds\).*formatCount\(faced\)|pluralRu\(folds/, "field evidence no longer exposes raw fold counts");
assert.match(byId.get("fold-j5-weak-backdoor").options.find((option) => option.key === "checkraise").feedback, /эксплойт.*оверфолд.*дисциплинированнее/i);
assert.match(byId.get("fold-t8-backdoor-only").answer, /эксплойт.*гатшот.*один.*раннер-раннер/i);
assert.doesNotMatch(source, /Лишн(?:ий|их) (?:check-raise|рейз|X\/R)/i, "optimistic check-raises are not framed as automatic blunders");
for (const requestedId of ["xr-jt-gutshot", "xr-qt-gutshot", "xr-qj-gutshot", "xr-k9-two-pair", "xr-k2-two-pair", "xr-99-set", "xr-22-set"]) {
  assert(byId.has(requestedId), `${requestedId} from the lesson brief is present`);
}

assert.equal(data.examples.tree, "bb_vs_late_rfi");
assert.equal(data.examples.observedLeague1, undefined, "Examples no longer publish sampled observed hands as full-history evidence");
const expectedObservedStructures = [
  "a_high_dry", "k_high_dry", "broadway", "low_connected",
  "paired", "two_tone", "monotone", "other"
];
if (false) {
const observedLeagueOne = data.examples.observedLeague1;
const observedSampleId = "league1-bb-xr-examples-q2-2026-v1";
const expectedObservedStructures = [
  "a_high_dry", "k_high_dry", "broadway", "low_connected",
  "paired", "two_tone", "monotone", "other"
];
const expectedObservedHashes = [
  "e8bcede1664fe9d8f09d7033289a6e52090c457dd87d7704e52cb52cd89d2944",
  "9d2e1c43a6e9692d12d8d38fa391b84b82622f62a932ecbe7473e3289dfc497e",
  "f52645b754938450eef19fbeedc1dc57078b5489c7d5aa0e4aef94192e49472d",
  "68beccd53c68e06aa6355213c025ee8e80fb5ededa719607f919d1997a97117f",
  "a8d903bf96b01e38a6120cdc06c499ef7f093da519418b8db280ac23996c8101",
  "8a4cca3a1c1d849ee7bcda27631cf81ce88dd32ab289c38a77a5069bd57220b2",
  "ed05a4e075b751905539ef8cca1b124e5a9aed30918c34bea314169247b8a83c",
  "ccbc1f4787326447c7632bcddd327505a6ec09f2968730fa6f01db948f5b6c1d"
];
assert(observedLeagueOne, "the Examples tab exposes the League 1 observed-HH block");
assert.equal(observedLeagueOne.sampleId, observedSampleId);
assert.equal(observedLeagueOne.queryVersion, observedSampleId);
assert(observedLeagueOne.title && observedLeagueOne.lead && observedLeagueOne.scope && observedLeagueOne.note);
assert.match(observedLeagueOne.scope, /rank 1–5|R1–5/i);
assert.match(observedLeagueOne.note, /не рекомендац|не частот/i, "a single observed HH is not presented as advice or a rate");
assert.deepEqual(
  Array.from(observedLeagueOne.hands, (hand) => hand.structureKey),
  expectedObservedStructures,
  "one exact League 1 HH covers every canonical flop structure in canonical order"
);
assert.deepEqual(
  Array.from(observedLeagueOne.hands, (hand) => hand.source.handKeyHash),
  expectedObservedHashes,
  "the eight selected physical hands stay pinned by non-PII hashes"
);
assert.equal(new Set(expectedObservedHashes).size, expectedObservedHashes.length);
for (const hand of observedLeagueOne.hands) {
  assert(hand.structureLabel, `${hand.structureKey} has a user-facing structure label`);
  assert.equal(hand.league, "league1", `${hand.structureKey} stays in League 1`);
  assert(Number.isInteger(hand.rank) && hand.rank >= 1 && hand.rank <= 5, `${hand.structureKey} has a League 1 rank`);
  assert.equal(hand.heroRole, "BB", `${hand.structureKey} keeps the observed check-raiser on BB`);
  assert.equal(hand.actionKey, "checkraise", `${hand.structureKey} is an observed check-raise`);
  assert(["CO", "BTN"].includes(hand.openerPosition), `${hand.structureKey} comes from a late-position opener`);
  assert.equal(hand.heroCards.length, 2, `${hand.structureKey} has two exact Hero cards`);
  assert.equal(hand.boardCards.length, 3, `${hand.structureKey} has three exact flop cards`);
  const exactCards = [...hand.heroCards, ...hand.boardCards];
  assert(exactCards.every((card) => /^[2-9TJQKA][cdhs]$/.test(card)), `${hand.structureKey} uses canonical exact cards`);
  assert.equal(new Set(exactCards).size, 5, `${hand.structureKey} has no duplicate physical cards`);
  assert(Number.isFinite(hand.openSizeBb) && hand.openSizeBb > 0 && hand.openSizeBb <= 3);
  assert(Number.isFinite(hand.effectiveStackBb) && hand.effectiveStackBb >= 20);
  assert(Number.isFinite(hand.cbetAmountBb) && hand.cbetAmountBb > 0);
  assert(Number.isFinite(hand.xrToBb) && hand.xrToBb > hand.cbetAmountBb);
  assert(["fold", "call", "reraise_allin"].includes(hand.villainResponse));
  assert.equal(hand.source.sampleId, observedSampleId);
  assert.equal(hand.source.queryVersion, observedSampleId);
  assert.equal(hand.source.rankTiming, "exact_as_of_hand");
  assert.equal(hand.source.period, "2026-Q2");
  assert.match(hand.source.handKeyHash, /^[a-f0-9]{64}$/);
}
assert.equal(observedLeagueOneArtifact.schemaVersion, 1);
assert.equal(observedLeagueOneArtifact.sampleId, observedSampleId);
assert.equal(observedLeagueOneArtifact.queryVersion, observedSampleId);
assert.equal(observedLeagueOneArtifact.purpose, "observed_hh_examples_only");
assert.deepEqual(observedLeagueOneArtifact.rank, {
  league: "league1",
  range: [1, 5],
  timing: "exact_as_of_hand"
});
assert.equal(observedLeagueOneArtifact.publication.ratesAllowed, false);
assert.equal(observedLeagueOneArtifact.publication.isRecommendation, false);
assert.equal(observedLeagueOneArtifact.publication.reverseHeroAggregateGateRelaxed, false);
assert.equal(observedLeagueOneArtifact.publication.physicalHandIds, "sha256_only");
assert.deepEqual(
  JSON.parse(JSON.stringify(observedLeagueOne.hands)),
  observedLeagueOneArtifact.hands,
  "browser data stays byte-for-field aligned with the independently saved exact-HH artifact"
);
}

const boardAtlas = data.examples.boardAtlas;
const expectedAtlasRoles = ["value", "semi_bluff", "check_call", "fold"];
const atlasObservedOnlyKeys = [
  "sampleId",
  "queryVersion",
  "handKeyHash",
  "rankTiming",
  "period",
  "league",
  "rank",
  "villainResponse",
  "cbetAmountBb",
  "xrToBb",
  "source"
];
const atlasRoleTotals = Object.fromEntries(expectedAtlasRoles.map((roleKey) => [roleKey, 0]));
const rankOrder = "23456789TJQKA";
const handClassFromCards = (cards) => {
  const [first, second] = Array.from(cards);
  const firstRank = first[0];
  const secondRank = second[0];
  if (firstRank === secondRank) return `${firstRank}${secondRank}`;
  const [high, low] = rankOrder.indexOf(firstRank) > rankOrder.indexOf(secondRank)
    ? [first, second]
    : [second, first];
  return `${high[0]}${low[0]}${high[1] === low[1] ? "s" : "o"}`;
};
assert(boardAtlas, "the Examples tab exposes the teaching board atlas");
assert.equal(boardAtlas.sourceKind, "teaching");
assert.match(boardAtlas.note, /учебная стратегия.*не наблюдени[ея] поля/i, "the atlas is not presented as observed field play");
assert.match(boardAtlas.scope, /BB против BTN.*40–60 BB.*25–33% банка/i, "the authored strategy has a concrete spot boundary");
assert.deepEqual(
  Array.from(boardAtlas.structures, (structure) => structure.key),
  expectedObservedStructures,
  "the teaching atlas covers every canonical flop structure in canonical order"
);
let atlasHandCount = 0;
for (const structure of boardAtlas.structures) {
  assert.equal(structure.sourceKind, "teaching", `${structure.key} stays inside the teaching layer`);
  assert(structure.label && structure.description, `${structure.key} has complete board-level teaching copy`);
  assert.equal(structure.boardCards.length, 3, `${structure.key} has three exact flop cards`);
  assert(structure.boardCards.every((card) => /^[2-9TJQKA][cdhs]$/.test(card)), `${structure.key} uses canonical flop cards`);
  assert.equal(new Set(structure.boardCards).size, 3, `${structure.key} has no duplicate flop cards`);
  assert.deepEqual(
    Array.from(structure.groups, (group) => group.roleKey),
    expectedAtlasRoles,
    `${structure.key} keeps the four teaching decisions in a stable order`
  );
  const structureCombos = new Set();
  for (const group of structure.groups) {
    assert.equal(group.sourceKind, "teaching", `${structure.key}.${group.roleKey} stays inside the teaching layer`);
    assert(group.roleLabel && group.actionLabel, `${structure.key}.${group.roleKey} has complete action copy`);
    assert.equal(group.hands.length, 2, `${structure.key}.${group.roleKey} has two distinct examples`);
    atlasRoleTotals[group.roleKey] += group.hands.length;
    for (const hand of group.hands) {
      assert.equal(hand.sourceKind, "teaching", `${structure.key}.${group.roleKey}.${hand.hand} is not mislabeled as an HH`);
      assert.equal(hand.heroCards.length, 2, `${structure.key}.${group.roleKey}.${hand.hand} has two exact Hero cards`);
      assert(hand.heroCards.every((card) => /^[2-9TJQKA][cdhs]$/.test(card)), `${structure.key}.${hand.hand} uses canonical Hero cards`);
      assert.equal(new Set([...structure.boardCards, ...hand.heroCards]).size, 5, `${structure.key}.${hand.hand} has no duplicate physical cards`);
      assert.equal(hand.hand, handClassFromCards(hand.heroCards), `${structure.key}.${hand.hand} matches its exact suits and ranks`);
      const combo = Array.from(hand.heroCards).sort().join("");
      assert(!structureCombos.has(combo), `${structure.key}.${hand.hand} is not duplicated elsewhere on the same board`);
      structureCombos.add(combo);
      atlasObservedOnlyKeys.forEach((key) => assert.equal(hand[key], undefined, `${structure.key}.${hand.hand} has no observed-HH key ${key}`));
      assert(hand.hand && hand.title && hand.reason && hand.turnPlan, `${structure.key}.${group.roleKey}.${hand.hand} has complete teaching copy`);
      atlasHandCount += 1;
    }
  }
}
assert.equal(atlasHandCount, 64, "the atlas exposes 8 boards × 4 decisions × 2 hands");
assert.deepEqual(atlasRoleTotals, { value: 16, semi_bluff: 16, check_call: 16, fold: 16 });
const boardAtlasText = JSON.stringify(boardAtlas.structures);
assert.doesNotMatch(boardAtlasText, /(?:\b20\d{2}-Q[1-4]\b|\bQ[1-4]\s+20\d{2}\b|\bLeague\b|\bЛига\b|\brank\b|\bранг\b|handKeyHash|sampleId|queryVersion)/i);
assert.doesNotMatch(boardAtlasText, /\d+(?:[.,]\d+)?%/, "the authored atlas does not present unsupported field rates");

assert.equal(data.examples.value.length, 3, "value examples are grouped by category, not duplicated per combo");
assert.equal(data.examples.bluff.length, 2, "bluff examples are grouped by category, not duplicated per combo");
const setExample = data.examples.value.find((example) => example.id === "example-set");
assert.deepEqual(
  Array.from(setExample.sourceSpotIds),
  ["xr-set-value", "xr-22-set", "xr-99-set"],
  "the set card leads with 77 on Q72tt and shows 22 then 99 as the extra hands"
);
assert.deepEqual(Array.from(setExample.representatives, (representative) => representative.hand), ["77", "22", "99"]);
assert.equal(
  setExample.playbook.summary.why,
  "Сильные руки не нужно слоуплеить: оппоненты чаще слишком пассивны, чтобы рассчитывать на их ставки. Блеф-кетчить можно с более слабыми руками — например, A9 или K3."
);
assert.equal(setExample.playbook.summary.turn, "Спокойно добирай, пока не получишь рейз.");
for (const example of [...data.examples.value, ...data.examples.bluff]) {
  assert.equal(example.tree, data.examples.tree);
  assert(byId.has(example.sourceSpotId), `${example.id} points to a practice spot`);
  const sourceSpot = byId.get(example.sourceSpotId);
  assert.deepEqual(Array.from(example.heroCards), Array.from(sourceSpot.table.heroCards));
  assert.deepEqual(Array.from(example.boardCards), Array.from(sourceSpot.table.boardCards));
  assert.equal(example.options, undefined, `${example.id} is explanatory, not a fake decision`);
  assert.match(example.representativeNote, /не приписывается общая полевая частота/i);
  assert.equal(example.playbook.action, "Чек-рейз до 5,5 BB");
  for (const key of ["baselineRole", "whyThisHand", "bestTurns", "slowdownTurns", "afterVillainContinues"]) {
    assert(example.playbook[key], `${example.id} has filled ${key}`);
  }
  assert(example.playbook.summary?.why, `${example.id} has a concise visible reason`);
  assert(example.playbook.summary?.turn, `${example.id} has a concise visible turn plan`);
  assert(["call", "fold"].includes(example.contrast.actionKey), `${example.id} has a Call/Fold boundary`);
  assert(example.contrast.shortCopy, `${example.id} has a concise visible contrast`);
  const contrastSpot = byId.get(example.contrast.sourceSpotId);
  assert(contrastSpot, `${example.id} contrast points to a practice spot`);
  assert.equal(contrastSpot.options.find((option) => option.correct).key, example.contrast.actionKey);
  assert.deepEqual(Array.from(example.contrast.heroCards), Array.from(contrastSpot.table.heroCards));
  assert.deepEqual(Array.from(example.contrast.boardCards), Array.from(contrastSpot.table.boardCards));
  assert.equal(example.sourceSpotIds.length, example.representatives.length);
  example.representatives.forEach((representative) => {
    const representativeSpot = byId.get(representative.sourceSpotId);
    assert(representativeSpot, `${example.id} representative points to a practice spot`);
    assert.deepEqual(Array.from(representative.heroCards), Array.from(representativeSpot.table.heroCards));
    assert.deepEqual(Array.from(representative.boardCards), Array.from(representativeSpot.table.boardCards));
  });
  assert.equal(example.evidence.status, "methodology_only");
  assert.match(example.evidence.scope, /учебная категория руки.*полевая частота.*не приписывается/i);
  assert(example.evidence.categoryKey, `${example.id} has a stable category key`);
  assert(example.evidence.categoryLabel, `${example.id} has a user-facing category label`);
  for (const leagueKey of ["league1", "league2", "league3"]) {
    assert.equal(example.evidence[leagueKey], undefined, `${example.id}.${leagueKey} does not fabricate observed counts`);
  }
  assert.equal(example.evidence.players, undefined, `${example.id} has no fabricated player count`);
}
assert.equal(new Set([...data.examples.value, ...data.examples.bluff].map((example) => example.evidence.categoryKey)).size, 5);
assert.deepEqual(
  [...data.examples.value, ...data.examples.bluff].flatMap((example) => Array.from(example.sourceSpotIds)).sort(),
  Array.from(data.practice)
    .filter((spot) => spot.options.find((option) => option.correct)?.key === "checkraise")
    .map((spot) => spot.id)
    .sort(),
  "every authored X/R candidate appears once inside the five category cards"
);
assert.match(data.examples.lead, /64 учебные руки.*пять подробных разборов/i);
assert.doesNotMatch(data.examples.lead, /реальн|наблюд/i);
assert.match(data.examples.method, /учебная стратегия.*не наблюдавшиеся раздачи поля/i);
assert.match(data.examples.bluff[0].contrast.copy, /один слабый бэкдор.*эксплойт.*два пути усиления/i);
assert.match(data.examples.bluff[1].contrast.copy, /один раннер-раннер.*эксплойт.*гатшот/i);

assert.match(html, /data-intro-table/);
assert.match(html, /data-step-target="examples"/);
assert.match(html, /data-period-label>Источник не опубликован</, "pending static copy does not expose a target window as completed data");
assert.match(html, /data-source-label/);
assert.match(html, /data-sample-note/);
assert.match(data.meta.sampleNote, /сыгранные решения.*не solver-чарт.*N ≥ 50.*скрываются/i);
assert.match(html, /Полевые частоты пока скрыты/, "static field copy is neutral before injection");
assert.match(html, /Проверяем источник полевых частот/, "the static loading state makes the source gate explicit");
assert.doesNotMatch(html, /Полная история FF/);
assert.match(html, /data-examples-league-one-scope>наблюдения поля загружаются</, "static example scope is neutral before reconciliation");
assert.match(fieldMatrixSource, /const observed = document\.querySelector\("\.example-observed"\)[\s\S]*observed\.hidden = true/, "sampled observed-hand host is hidden by the exact field layer");
assert.match(fieldMatrixSource, /function reconcileStaticCopy\(\)/, "exact field copy is reconciled on first paint and load");
assert.match(html, /data-examples-atlas/, "the Examples tab has a dedicated teaching-atlas host");
assert.match(shared, /function renderExampleAtlas\(host, atlasData\)/, "the shared renderer owns the compact teaching atlas");
assert.match(shared, /source\.boardAtlas/, "the renderer consumes the teaching atlas through a separate data contract");
assert.match(shared, /tabs\.setAttribute\("role", "tablist"\)/, "the board selector exposes tab semantics");
assert.match(shared, /panel\.setAttribute\("role", "tabpanel"\)/, "the selected board exposes panel semantics");
assert.match(shared, /button\.setAttribute\("aria-pressed", "false"\)/, "teaching-hand selectors expose pressed state");
assert.match(sharedCss, /\.example-atlas-tabs\s*\{/, "the atlas has a dedicated compact board selector");
assert.match(sharedCss, /\.example-atlas-inspector\s*\{/, "the atlas has one shared explanation inspector");
assert.match(sharedCss, /\.example-atlas\s*>\s*\[data-examples-atlas\][\s\S]*min-width:\s*0/, "the atlas host cannot leak flex min-content width on mobile");
assert.doesNotMatch(
  html,
  /3 короткие мысли|стрелки, точки или свайп/,
  "wisdom heading has no redundant carousel instructions"
);
assert.doesNotMatch(html, /example-group-index/, "examples use aligned section headings without decorative counters");
assert.doesNotMatch(html, /data-examples-note/, "scenario scope is not repeated as a technical footnote");
assert.doesNotMatch(html, /data-practice-mode=/, "the old finite-pack focus picker is gone");
assert.match(html, /data-practice-depth="flop"[^>]*>Только флоп/);
assert.match(html, /data-practice-depth="full"[^>]*>Полная раздача/);
assert.match(html, /Где здесь чек-рейз\?/);
assert.match(html, /У оппонента есть фолды на рейз/);
assert.match(html, /data-practice-score/);
assert.match(html, /data-practice-reset/);
assert.match(html, /data-practice-next-external disabled/);
assert.match(html, /data-practice-continuation-external hidden/);
assert.doesNotMatch(html, /data-practice-start/, "practice opens directly on the first playable hand");
assert.doesNotMatch(html, /data-practice-xr-rate|data-practice-missed-xr|data-practice-extra-xr/, "technical X/R counters do not crowd the main loop");
assert.doesNotMatch(html, /Функциональный snapshot|T♥9♥ до showdown|Оптимистичных X\/R/, "setup and methodological copy stay out of the playable screen");
assert.doesNotMatch(html, /По базе FF|rank 1–5|Учебный атлас|Бесконечная практика/, "technical setup labels stay out of the visible lesson shell");
assert.match(shared, /console\.error\(`\[\$\{lessonKey \|\| "poker-field-lesson"\}\] data validation failed`/, "full validation detail goes to the console");
assert.match(shared, /Данные урока не загрузились\. Обнови страницу или попробуй позже\./, "validation failures use neutral learner-facing copy");
assert.doesNotMatch(shared, /Функциональный стол не загрузился|проверьте shared snapshot|проверьте формат table\/options/, "render failures do not expose implementation details");
assert.match(shared, /const endedWithoutShowdown = result\.showdown === false/, "completion feedback distinguishes fold terminals from showdowns");
assert.match(shared, /Без шоудауна · соперник выбросил/, "fold completion never claims that a showdown happened");
assert.match(shared, /будущий ранаут и его рука не раскрываются/, "fold completion explains why no cards or future streets appear");
const sharedCssHash = createHash("sha256")
  .update(sharedCss.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
assert.match(html, new RegExp(`assets/poker-field-lesson/lesson\\.css\\?v=${sharedCssHash}`));
const practiceGeneratorHash = createHash("sha256")
  .update(practiceGeneratorSource.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
assert.match(html, new RegExp(`assets/poker-flop-checkraise-lesson/practice-generator\\.js\\?v=${practiceGeneratorHash}`));
const sourceHash = createHash("sha256")
  .update(source.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
assert.match(html, new RegExp(`assets/poker-flop-checkraise-lesson/data\\.js\\?v=${sourceHash}`));
const sharedHash = createHash("sha256")
  .update(shared.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
assert.match(html, new RegExp(`assets/poker-field-lesson/lesson\\.js\\?v=${sharedHash}`));
assert.match(html, /data-structure-league-matrix/);
const fieldMatrixCssHash = createHash("sha256")
  .update(fieldMatrixCss.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
const fieldMatrixHash = createHash("sha256")
  .update(fieldMatrixSource.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
const confidenceHash = createHash("sha256")
  .update(confidenceSource.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
const continuationControllerHash = createHash("sha256")
  .update(continuationControllerSource.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
const continuationDataHash = createHash("sha256")
  .update(continuationDataSource.replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
  .digest("hex")
  .slice(0, 12);
assert.match(html, new RegExp(`field-matrix\\.css\\?v=${fieldMatrixCssHash}`));
assert.match(html, new RegExp(`field-matrix\\.js\\?v=${fieldMatrixHash}`));
assert.match(html, new RegExp(`observed-frequency-confidence\\.js\\?v=${confidenceHash}`));
assert.match(html, new RegExp(`simulator-continuation\\.js\\?v=${continuationControllerHash}`));
assert.match(html, new RegExp(`poker-flop-checkraise-lesson/continuations\\.js\\?v=${continuationDataHash}`));
assert.doesNotMatch(html, /data-cohort-cards/, "check-raise field tab is now structure-first rather than four aggregate cards");
assert.ok(html.indexOf("simulator-snapshot.js") < html.indexOf("poker-flop-checkraise-lesson/data.js"));
assert.ok(html.indexOf("simulator-practice.js") < html.indexOf("simulator-continuation.js"));
assert.ok(html.indexOf("simulator-continuation.js") < html.indexOf("poker-flop-checkraise-lesson/continuations.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/continuations.js") < html.indexOf("poker-flop-checkraise-lesson/data.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/practice-generator.js") < html.indexOf("poker-flop-checkraise-lesson/data.js"));
assert.ok(html.indexOf("observed-frequency-confidence.js") < html.indexOf("poker-flop-checkraise-lesson/field-matrix.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/data.js") < html.indexOf("poker-flop-checkraise-lesson/field-matrix.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/field-matrix.js") < html.indexOf("poker-field-lesson/lesson.js"));
assert.match(fieldMatrixSource, /function renderMix\(row, compact = false\)/);
assert.match(fieldMatrixSource, /function renderSummaries\(\)/);
assert.match(fieldMatrixSource, /function renderDifference\(\)/);
assert.match(fieldMatrixSource, /function renderTable\(\)/);
assert.match(fieldMatrixSource, /Сравниваем не сырую частоту одной кнопки, а весь ответ BB/);
assert.match(fieldMatrixSource, /BB заколлировал опен CO\/BTN, чекнул и встретил c-bet/);
for (const label of ["Пас", "Колл", "Чек-рейз"]) assert.match(fieldMatrixSource, new RegExp(`label: "${label}"`));
assert.match(fieldMatrixSource, /observedConfidence\?\.rate\?\.\(numerator, denominator\)/, "matrix percentages use the shared exact-frequency gate");
assert.doesNotMatch(fieldMatrixSource, /Мало данных|Ориентир по небольшой выборке/, "the learner UI has no sample-size substitute labels");
assert.match(fieldMatrixSource, /console\.error\("\[flop-checkraise\] full-history field validation failed"/, "matrix validation detail goes to the console");
assert.match(fieldMatrixSource, /Данные поля не загрузились[\s\S]*?Обнови страницу или попробуй позже\./, "matrix failures use neutral learner-facing copy");
assert.match(fieldMatrixSource, /Пока здесь намеренно нет процентов и сравнительных выводов/, "methodology-only field state contains no observed claims");
const pendingMatrixSource = fieldMatrixSource.slice(fieldMatrixSource.indexOf("function renderPending()"), fieldMatrixSource.indexOf("function reconcileStaticCopy()"));
assert.match(pendingMatrixSource, /полной проверки раздач и групп игроков/);
assert.doesNotMatch(pendingMatrixSource, /hand_player_id|latest-version|N\s*[≥>]/i);
assert.match(fieldMatrixCss, /structure-league-pending[\s\S]*min-height:\s*260px/, "pending field state is a deliberate panel, not an error stub");
assert.match(fieldMatrixCss, /structure-league-table\s*\{[\s\S]*?min-width:\s*0;/, "the desktop matrix has no artificial horizontal floor");
assert.match(fieldMatrixCss, /structure-league-summary-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/, "all four cohorts are visible together on desktop");
assert.match(fieldMatrixCss, /thead th:first-child\s*\{\s*width:\s*13%;/, "stack leaves room for four cohort columns");
assert.match(fieldMatrixCss, /thead th:not\(:first-child\)\s*\{\s*width:\s*21\.75%;/, "four cohort columns share the remaining width");
assert.match(fieldMatrixCss, /structure-response-bar \.is-fold\s*\{\s*background:\s*#8da6c9;/, "fold has its own readable action color");
assert.match(fieldMatrixCss, /structure-response-bar \.is-call\s*\{\s*background:\s*#56d3a8;/, "call has its own readable action color");
assert.match(fieldMatrixCss, /structure-response-bar \.is-raise\s*\{\s*background:\s*#dd58aa;/, "check-raise has its own readable action color");
assert.match(
  fieldMatrixCss,
  /wisdom-slide\.has-value-range-slide \.wisdom-value-copy-list\s*\{\s*display:\s*none;/,
  "the illustrated value card is the single source of the hand list"
);
for (const annotationClass of [
  "wisdom-board-kicker",
  "wisdom-value-range-title",
  "wisdom-value-group-head",
  "wisdom-value-combo-label",
  "wisdom-value-note"
]) {
  assert.doesNotMatch(
    fieldMatrixCss,
    new RegExp(`wisdom-slide\\.has-value-range-slide \\.${annotationClass}\\s*\\{[^}]*display:\\s*none;`),
    `${annotationClass} stays visible in the labelled K92 range`
  );
}
assert.match(
  fieldMatrixCss,
  /wisdom-value-group\.is-strong \.wisdom-value-combos\s*\{\s*grid-template-columns:\s*repeat\(5,/,
  "all five strong-value hands stay on one compact picture row"
);
assert.match(
  fieldMatrixCss,
  /wisdom-value-group\.is-thin \.wisdom-value-combos\s*\{\s*grid-template-columns:\s*repeat\(3,/,
  "the three mixed Kx hands stay on one compact picture row"
);
assert.match(
  fieldMatrixCss,
  /@media \(max-width: 590px\)[\s\S]*?wisdom-value-group\.is-strong \.wisdom-value-combos\s*\{\s*grid-template-columns:\s*repeat\(3,/,
  "the labelled strong-value range reflows instead of clipping on mobile"
);
assert.match(fieldMatrixCss, /structure-league-mobile-label/);
assert.match(fieldMatrixCss, /@media \(max-width: 820px\)/);
assert.match(
  sharedCss,
  /\.flop-checkraise-lesson \[data-step="examples"\] \.example-color-card \.poker-deck-card__cb-index\s*\{\s*display:\s*none;/,
  "every small color-block card in check-raise examples hides corner annotations"
);
assert.doesNotMatch(
  sharedCss,
  /\.example-variant-chip span\s*\{/,
  "variant labels never cascade into the card rank"
);
for (const actionKey of ["fold", "call", "checkraise"]) {
  assert.match(
    sharedCss,
    new RegExp(`\\.flop-checkraise-lesson \\[data-step="deal"\\][\\s\\S]*?\\.table-action\\[data-option-key="${actionKey}"\\]`),
    `${actionKey} gets a scoped opening-decision color`
  );
}
assert.match(sharedCss, /data-option-key="fold"[\s\S]*?rgba\(72, 18, 17, \.36\)/, "fold stays red");
assert.match(sharedCss, /data-option-key="call"[\s\S]*?rgba\(255, 255, 255, \.035\)/, "call stays neutral");
assert.match(sharedCss, /data-option-key="checkraise"[\s\S]*?#b697e1[\s\S]*?#dabe58/, "check-raise stays gold");
assert.match(
  sharedCss,
  /\.example-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  "value examples align in one three-card row on wide screens"
);
assert.match(
  sharedCss,
  /@media \(min-width:\s*901px\)\s*\{[\s\S]*?\.flop-checkraise-lesson \[data-step="practice"\] \.practice-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(560px,\s*1\.45fr\)\s*minmax\(280px,\s*\.55fr\);[\s\S]*?align-items:\s*stretch;/,
  "check-raise practice gives the playable table c-bet-like priority on desktop"
);
assert.match(
  sharedCss,
  /\.flop-checkraise-lesson \[data-practice-next-external\]:disabled\s*\{[\s\S]*?opacity:\s*\.38;[\s\S]*?cursor:\s*not-allowed;/,
  "the external next action does not look enabled before an answer"
);
assert.match(shared, /FFTrainerSimulator\.renderDecision/);
assert.match(shared, /practiceModeErrors/);
assert.match(shared, /practiceGeneratorErrors/);
assert.match(shared, /createPracticeSession/);
assert.match(shared, /nextGeneratedPracticeSpot/);
assert.match(shared, /missedXr/);
assert.match(shared, /Ниже учебной линии/);
assert.match(shared, /Допустимый эксплойт/);
assert.match(shared, /practicePresentation\)\.autoStart/);
assert.match(shared, /data-practice-next-external/);
assert.match(shared, /data-practice-continuation-external/);
assert.match(shared, /data-practice-depth/);
assert.match(shared, /state\.practiceChoice !== "fold"/, "full-hand mode ends immediately when Hero folds the flop");
assert.match(shared, /Чек-рейз — ок/);
assert.match(shared, /Чек-рейз — тоже ок/);
assert.match(shared, /Допустимый микс/);
assert.match(shared, /Лузовый чек-рейз/);
assert.match(shared, /Очевидно пропущенный чек-рейз/);
assert.match(shared, /compact \? "Что делаешь\?" : spot\.question/);
assert.match(shared, /replace\(\/\^Верно:/);
assert.match(shared, /revealPracticeNode\("\[data-practice-feedback\]"\)/);
assert.match(shared, /revealPracticeNode\("\[data-practice-table\]"\)/);
assert.match(shared, /decisionOutcomeFor/);
assert.match(shared, /expectedXr/);
assert.match(shared, /mountContinuation/);
assert.match(shared, /data-practice-continuation/);
assert.doesNotMatch(shared, /BTN коллирует учебный check-raise|BTN открыл K♦K♠/);
assert.doesNotMatch(continuationControllerSource, /FFTrainerEvents|FFPlayerProgress|localStorage|sessionStorage/, "continuation does not create a second telemetry or persistence path");
assert.doesNotMatch(shared, /host\.className = `decision-feedback/, "feedback keeps structural coach classes");

const documentStub = {
  body: { dataset: { lessonKey: "flop-checkraise" }, classList: { add() {} } },
  title: "",
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { throw new Error("validation contract must not need rendered DOM"); }
};
const runtimeContext = {
  document: documentStub,
  window: {
    FF_POKER_FIELD_LESSON_DATA: data,
    localStorage: { getItem() { return null; }, setItem() {} },
    requestAnimationFrame(callback) { callback(); },
    scrollTo() {}
  }
};
vm.runInNewContext(shared, runtimeContext, { filename: "poker-field-lesson/lesson.js" });

const fieldMatrixRuntime = {
  document: { querySelector() { return null; } },
  window: { FF_POKER_FIELD_LESSON_DATA: data }
};
vm.runInNewContext(fieldMatrixSource, fieldMatrixRuntime, { filename: "poker-flop-checkraise-lesson/field-matrix.js" });
const validateFieldMatrix = fieldMatrixRuntime.window.FFCheckraiseFieldMatrix.validate;
assert.deepEqual(Array.from(validateFieldMatrix(field).errors), []);
const invalidField = JSON.parse(JSON.stringify(field));
invalidField.meta.rankTiming = "current_rank";
invalidField.meta.windowEndExclusive = "2026-07-23";
const invalidResponseRows = invalidField.rows.filter((row) => row.node === "bb_response");
invalidResponseRows[0].folds += 1;
invalidResponseRows[1].publishable = false;
invalidField.rows = invalidField.rows.filter((row) => row.cohort !== "novice");
const invalidFieldErrors = Array.from(validateFieldMatrix(invalidField).errors);
assert(invalidFieldErrors.some((error) => /exact rank-at-hand/.test(error)));
assert(invalidFieldErrors.some((error) => /нужно окно/.test(error)));
assert(invalidFieldErrors.some((error) => /действия не сходятся/.test(error)));
assert(invalidFieldErrors.some((error) => /нарушен N=50 gate/.test(error)));
assert(invalidFieldErrors.some((error) => /нет novice/.test(error)));

const rateFeedback = runtimeContext.window.FFPokerFieldLesson.practiceRateFeedbackFor;
const decisionOutcome = runtimeContext.window.FFPokerFieldLesson.decisionOutcomeFor;
const gutshotSession = context.window.FFFlopCheckraisePracticeGenerator.createSession({ seed: "diagnose-86s-k95" });
let gutshotSpot = null;
for (let attempt = 0; attempt < 80 && gutshotSpot?.practiceMeta.archetype !== "thin-gutshot"; attempt += 1) {
  gutshotSpot = gutshotSession.next();
}
assert.equal(gutshotSpot.practiceMeta.archetype, "thin-gutshot");
assert.equal(
  decisionOutcome(gutshotSpot.options.find((option) => option.key === "checkraise"), gutshotSpot.options.find((option) => option.correct)),
  "alternative",
  "the 86s gutshot check-raise is accepted as a mix rather than graded as an error"
);
const generator = context.window.FFFlopCheckraisePracticeGenerator;
assert.equal(
  generator.isBlockerOvercardMix({ id: "call-strong-overcards" }, ["Kc", "Qs"], ["Js", "7d", "2h"]),
  true,
  "KQ on J72r remains a blocker-overcard mix regardless of shuffled bag order"
);
const kqJ72Session = generator.createSession({ seed: "kq-j72-btnshot-1653" });
let kqJ72Spot = null;
for (let attempt = 0; attempt < 80 && kqJ72Spot?.practiceMeta.archetype !== "call-strong-overcards"; attempt += 1) {
  kqJ72Spot = kqJ72Session.next();
}
assert.equal(kqJ72Spot.practiceMeta.archetype, "call-strong-overcards");
assert.equal(
  decisionOutcome(kqJ72Spot.options.find((option) => option.key === "checkraise"), kqJ72Spot.options.find((option) => option.correct)),
  "alternative",
  "the KQ blocker check-raise on J72r is accepted as a mix rather than a loose exploit"
);
const allMode = { compareExpectedXr: true, reference: "Учебная линия" };
const j5Spot = byId.get("fold-j5-weak-backdoor");
assert.equal(
  decisionOutcome(j5Spot.options.find((option) => option.key === "checkraise"), j5Spot.options.find((option) => option.correct)),
  "alternative",
  "one-backdoor X/R is a permitted exploit bucket rather than a hard mistake"
);
assert.equal(
  decisionOutcome(j5Spot.options.find((option) => option.key === "call"), j5Spot.options.find((option) => option.correct)),
  "wrong",
  "the exploit exception stays scoped to the opted-in check-raise"
);
assert.match(
  rateFeedback(allMode, { hands: 3, checkraises: 1, expectedXr: 2, missedXr: 2, extraXr: 1 }),
  /Ниже учебной линии.*Пропущенных X\/R: 2; оптимистичных X\/R: 1/,
  "below-line feedback reports real missed and extra composition, not the net gap"
);
assert.match(
  rateFeedback(allMode, { hands: 3, checkraises: 2, expectedXr: 1, missedXr: 1, extraXr: 2 }),
  /Выше базовой линии.*Пропущенных X\/R: 1; оптимистичных X\/R: 2.*эксплойт допустим/i,
  "above-line feedback reports real missed and extra composition, not the net gap"
);
assert.match(
  rateFeedback(allMode, { hands: 4, checkraises: 2, expectedXr: 2, missedXr: 1, extraXr: 1 }),
  /По частоте — как в базовой линии.*состав отличается.*Пропущенных X\/R: 1; оптимистичных X\/R: 1/,
  "offsetting mistakes are not praised as a matching composition"
);

const incomplete = JSON.parse(JSON.stringify(data));
incomplete.cohorts[0].actions[0].pct = null;
incomplete.examples.value[0].tree = "rvcc";
incomplete.examples.value[0].playbook.bestTurns = "";
incomplete.examples.value[0].evidence.status = "ready";
incomplete.practiceGenerator.global = "";
incomplete.wisdom[1].visual.boardCards[1] = "Kc";
incomplete.wisdom[1].visual.groups[1].hands.push({ label: "K9", cards: ["Kh", "9s"] });
incomplete.wisdom[1].visual.groups[0].hands[0].cards = ["Kc", "9c"];
incomplete.wisdom[1].visual.note = "";
assert.deepEqual(Array.from(runtimeContext.window.FFPokerFieldLesson.validateData(data).errors), [], "methodology-only examples need no fabricated observed counts");
const incompleteErrors = runtimeContext.window.FFPokerFieldLesson.validateData(incomplete).errors;
assert(incompleteErrors.some((error) => /actions\[0\]: нет pct/.test(error)), "missing pct is rejected");
assert(incompleteErrors.some((error) => /tree должен быть bb_vs_late_rfi/.test(error)), "wrong example tree is rejected");
assert(incompleteErrors.some((error) => /playbook: нет bestTurns/.test(error)), "empty example turn plan is rejected");
assert(incompleteErrors.some((error) => /practiceGenerator\.global/.test(error)), "missing procedural provider global is rejected");
assert(incompleteErrors.some((error) => /три уникальные валидные карты/.test(error)), "duplicate board card is rejected");
assert(incompleteErrors.some((error) => /рука K9 повторяется/.test(error)), "duplicate value hand is rejected");
assert(incompleteErrors.some((error) => /две валидные карты без конфликта/.test(error)), "value example cannot reuse a board card");
assert(incompleteErrors.some((error) => /нет note/.test(error)), "missing value-range explanation is rejected");
assert(incompleteErrors.some((error) => /нет X\/R numerator или denominator/.test(error)), "ready evidence still requires exact counts");
assert(incompleteErrors.some((error) => /нет числа игроков/.test(error)), "ready evidence still requires player support");

console.log("flop check-raise lesson contract: ok");
