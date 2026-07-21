import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const [html, source, shared, sharedCss, continuationDataSource, practiceGeneratorSource, continuationControllerSource, sizeMatchedCsv, fieldMatrixSource, fieldMatrixCss, fieldMatrixCsv, observedLeagueOneJson] = await Promise.all([
  readFile(path.join(root, "flop-checkraise-lesson.html"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/data.js"), "utf8"),
  readFile(path.join(root, "assets/poker-field-lesson/lesson.js"), "utf8"),
  readFile(path.join(root, "assets/poker-field-lesson/lesson.css"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/continuations.js"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/practice-generator.js"), "utf8"),
  readFile(path.join(root, "assets/poker-trainer-shell/simulator-continuation.js"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/research/size-matched-k-high-dry-folds.csv"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/field-matrix.js"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/field-matrix.css"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/research/structure-league-field-matrix.csv"), "utf8"),
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/research/league1-bb-xr-examples-q2-2026.json"), "utf8")
]);

const context = { window: {} };
vm.runInNewContext(continuationDataSource, context, { filename: "poker-flop-checkraise-lesson/continuations.js" });
vm.runInNewContext(practiceGeneratorSource, context, { filename: "poker-flop-checkraise-lesson/practice-generator.js" });
vm.runInNewContext(source, context, { filename: "poker-flop-checkraise-lesson/data.js" });
const data = context.window.FF_POKER_FIELD_LESSON_DATA;
const observedLeagueOneArtifact = JSON.parse(observedLeagueOneJson);

assert.equal(data.schemaVersion, 1);
assert.equal(data.key, "flop-checkraise");
assert.equal(data.wisdom.length, 3);
assert.equal(data.wisdom[1].rule, undefined, "the second wisdom slide has no extra rule callout");
assert.equal(data.wisdom[2].rule, undefined, "the third wisdom slide has no extra rule callout");
assert.equal(data.wisdom[2].title, "На низких лимитах фолдят больше");
assert.match(data.wisdom[2].copy, /все телефонят/);
assert.match(data.wisdom[2].copy, /League 3 фолдит 60,2%/);
const valueVisual = data.wisdom[1].visual;
assert.equal(data.wisdom[1].title, "Рейзим не только блефы");
assert.match(data.wisdom[1].copy, /велью-часть/);
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
assert.match(shared, /visual\.classList\.add\("has-value-range"\)/);
assert.match(sharedCss, /\.wisdom-value-range\s*\{/);
assert.match(sharedCss, /\.wisdom-value-combo\s*\{/);
assert.doesNotMatch(
  shared,
  /makeElement\("footer", "wisdom-board-folds-foot"\)/,
  "the third wisdom slide does not render the technical HH footer"
);
assert.match(shared, /Порог выгодности чистого блефа/, "the breakeven label explains that the threshold is about profitability");
assert.deepEqual(Array.from(data.cohorts, (cohort) => cohort.key), ["league1", "league2", "league3", "rank15_17"]);
assert(data.cohorts.every((cohort) => cohort.display === "independent"));
assert.equal(
  JSON.stringify(Array.from(data.cohorts, (cohort) => Array.from(cohort.actions, (action) => Number(action.pct.toFixed(2))))),
  JSON.stringify([[15.91, 44.69], [15.88, 48.38], [13.55, 54.85], [10.79, 54.84]]),
  "published BB X/R and aggressor fold-vs-X/R rates stay exact"
);
assert.deepEqual(Array.from(data.cohorts[3].samples, (sample) => sample.value), [100372, 22434]);
assert.match(data.meta.sampleNote, /разные|отдельно/i);

const STRUCTURE_KEYS = [
  "a_high_dry", "k_high_dry", "broadway", "low_connected",
  "paired", "two_tone", "monotone", "other"
];
const LEAGUE_KEYS = ["league1", "league2", "league3"];
const field = data.fieldMatrix;
assert.equal(field.version, 1);
assert.equal(field.role, "aggressor");
assert.equal(field.rankRole, "preflop_aggressor");
assert.deepEqual(Array.from(field.positions), ["CO", "BTN"]);
assert.equal(field.canonicalNode, false);
assert.deepEqual(
  Object.fromEntries(Object.entries(field.reliability)),
  { directionalMin: 50, solidMin: 200 },
  "field matrix publishes the same sample-size contract as the c-bet cube"
);
assert.equal(field.sample.kind, "deterministic_hh_sample");
assert.equal(field.sample.percent, 70);
assert.equal(field.sample.analysisIncluded, true);
assert.deepEqual(
  [field.sample.compactRows, field.sample.parsedRows, field.sample.rankedRows, field.sample.coBtnRows, field.sample.positionParseErrors],
  [2300854, 2297953, 2256311, 1267631, 21]
);
assert.match(field.definitions.cbet, /как часто CO\/BTN ставит c-bet в BB.*возможности/i);
assert.match(field.definitions.foldVsXr, /фолды.*встреченные check-raise/i);
assert.deepEqual(Array.from(field.foldViews, (view) => view.key), ["overall", "matched"]);
assert.equal(field.defaultFoldView, "overall");
assert.deepEqual(Array.from(field.leagues, (league) => league.key), LEAGUE_KEYS);
assert.deepEqual(Array.from(field.rows, (row) => row.key), STRUCTURE_KEYS);
assert.match(field.note, /разные знаменатели/i);
assert.match(field.note, /каноническ/i);

const expectedFieldTotals = {
  league1: {
    cbets: 150558, opportunities: 169252, folds: 10433, faced: 23009,
    matchedFolds: 841, matchedFaced: 2085,
    opportunityPlayers: 185, facedPlayers: 185, matchedPlayers: 173
  },
  league2: {
    cbets: 409656, opportunities: 454300, folds: 28611, faced: 58987,
    matchedFolds: 2928, matchedFaced: 6635,
    opportunityPlayers: 554, facedPlayers: 549, matchedPlayers: 514
  },
  league3: {
    cbets: 578228, opportunities: 644079, folds: 40808, faced: 74387,
    matchedFolds: 4876, matchedFaced: 9161,
    opportunityPlayers: 1276, facedPlayers: 1227, matchedPlayers: 982
  }
};

const fieldCells = new Set();
for (const row of field.rows) {
  assert.equal(Object.keys(row.values).length, 3, `${row.key} has three league cells`);
  for (const leagueKey of LEAGUE_KEYS) {
    const cell = row.values[leagueKey];
    fieldCells.add(`${row.key}:${leagueKey}`);
    const { made, opportunities } = cell.cbet;
    assert(Number.isInteger(made) && Number.isInteger(opportunities));
    assert(opportunities > 0 && made >= 0 && made <= opportunities);
    for (const viewKey of ["overall", "matched"]) {
      const { folds, faced } = cell.foldVsXr[viewKey];
      assert(Number.isInteger(folds) && Number.isInteger(faced));
      assert(faced > 0 && folds >= 0 && folds <= faced && faced <= made);
    }
    assert(cell.foldVsXr.matched.faced <= cell.foldVsXr.overall.faced);
  }
}
assert.equal(fieldCells.size, 24);
const thinMatchedCell = field.rows.find((row) => row.key === "low_connected").values.league1.foldVsXr.matched;
const directionalMatchedCell = field.rows.find((row) => row.key === "broadway").values.league1.foldVsXr.matched;
assert.deepEqual([thinMatchedCell.folds, thinMatchedCell.faced], [14, 38]);
assert.deepEqual([directionalMatchedCell.folds, directionalMatchedCell.faced], [69, 144]);
assert.match(
  fieldMatrixSource,
  /function reliabilityFor\(denominator\)[\s\S]*denominator < directionalMin[\s\S]*"thin"[\s\S]*denominator < solidMin[\s\S]*"directional"/,
  "matrix classifies thin and directional denominators"
);
assert.match(
  fieldMatrixSource,
  /reliability === "thin" \? "Мало данных"[\s\S]*процент скрыт[\s\S]*reliability === "directional"[\s\S]*направление/,
  "matrix hides thin percentages and labels directional samples"
);
assert.match(fieldMatrixCss, /data-reliability="thin"[\s\S]*font-size:/, "thin values fit as copy instead of a percentage");

for (const league of field.leagues) {
  const totals = field.rows.reduce((sum, row) => {
    const cell = row.values[league.key];
    sum.cbets += cell.cbet.made;
    sum.opportunities += cell.cbet.opportunities;
    sum.folds += cell.foldVsXr.overall.folds;
    sum.faced += cell.foldVsXr.overall.faced;
    sum.matchedFolds += cell.foldVsXr.matched.folds;
    sum.matchedFaced += cell.foldVsXr.matched.faced;
    return sum;
  }, { cbets: 0, opportunities: 0, folds: 0, faced: 0, matchedFolds: 0, matchedFaced: 0 });
  const expected = expectedFieldTotals[league.key];
  assert.deepEqual(totals, {
    cbets: expected.cbets,
    opportunities: expected.opportunities,
    folds: expected.folds,
    faced: expected.faced,
    matchedFolds: expected.matchedFolds,
    matchedFaced: expected.matchedFaced
  });
  assert.deepEqual(
    [league.opportunityPlayers, league.facedPlayers, league.matchedPlayers],
    [expected.opportunityPlayers, expected.facedPlayers, expected.matchedPlayers]
  );
}

const fieldMatrixLines = fieldMatrixCsv.trim().split("\n");
const fieldMatrixHeaders = fieldMatrixLines[0].split(",");
const fieldMatrixArtifactRows = fieldMatrixLines.slice(1).map((line) => {
  const values = line.split(",");
  return Object.fromEntries(fieldMatrixHeaders.map((header, index) => [header, values[index]]));
});
assert.equal(fieldMatrixArtifactRows.length, 24);
for (const artifact of fieldMatrixArtifactRows) {
  const dataRow = field.rows.find((row) => row.key === artifact.structure);
  const dataCell = dataRow.values[artifact.league];
  assert.deepEqual(
    [
      dataCell.cbet.made,
      dataCell.cbet.opportunities,
      dataCell.foldVsXr.overall.folds,
      dataCell.foldVsXr.overall.faced,
      dataCell.foldVsXr.matched.folds,
      dataCell.foldVsXr.matched.faced
    ],
    [
      Number(artifact.cbet_made),
      Number(artifact.cbet_opportunities),
      Number(artifact.overall_folds),
      Number(artifact.overall_faced_xr),
      Number(artifact.matched_folds),
      Number(artifact.matched_faced_xr)
    ]
  );
}

const foldVisual = data.wisdom[2].visual;
assert.equal(foldVisual.type, "board-folds");
assert.equal(foldVisual.sampleId, "strict-k-high-size-window-q2-2026");
assert.equal(foldVisual.cohortRole, "aggressor");
assert.equal(foldVisual.breakeven, 42.97, "the bluff threshold stays in the visual card after simplifying the lesson copy");
assert.deepEqual(Array.from(foldVisual.boardCards), ["Kc", "8h", "2s"]);
assert.equal(new Set(foldVisual.boardCards).size, 3);
assert.match(foldVisual.boardScope, /представитель класса/i, "K82r stays representative rather than exact-board evidence");
assert.match(foldVisual.sizing.cbet, /30–36%/);
assert.match(foldVisual.sizing.checkraise, /95–105%/);
assert.deepEqual(Array.from(foldVisual.rows, (row) => row.key), ["league1", "league2", "league3"]);
assert.deepEqual(
  Array.from(foldVisual.rows, (row) => [row.folds, row.faced, row.players]),
  [[46, 93, 69], [110, 242, 178], [162, 269, 211]],
  "size- and board-class-matched Q2 HH counts stay exact"
);
assert.deepEqual(
  Array.from(foldVisual.rows, (row) => Number((row.folds / row.faced * 100).toFixed(2))),
  [49.46, 45.45, 60.22]
);
const sizeMatchedRows = sizeMatchedCsv.trim().split("\n").slice(1).map((line) => line.split(","));
assert.deepEqual(
  sizeMatchedRows.map((row) => [row[2], Number(row[10]), Number(row[11]), Number(row[12])]),
  [["league1", 46, 93, 69], ["league2", 110, 242, 178], ["league3", 162, 269, 211]],
  "browser data stays aligned with the published aggregate artifact"
);
const fieldKHighLeague2 = field.rows.find((row) => row.key === "k_high_dry").values.league2.foldVsXr.matched;
assert.equal(field.sample.id, "nearby-rvbb-structure-matrix-q2-2026");
assert.notEqual(field.sample.id, foldVisual.sampleId, "the strict card and nearby structure matrix keep distinct sample contracts");
assert.deepEqual(
  [foldVisual.rows.find((row) => row.key === "league2").faced, fieldKHighLeague2.faced],
  [242, 243],
  "the one-hand denominator difference is explicit rather than silently conflated"
);
assert.match(field.foldViews.find((view) => view.key === "matched").note, /обзорный.*N не обязан совпадать/i);

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
assert.match(byId.get("fold-t8-backdoor-only").answer, /эксплойт.*gutshot.*один.*runner-runner/i);
assert.doesNotMatch(source, /Лишн(?:ий|их) (?:check-raise|рейз|X\/R)/i, "optimistic check-raises are not framed as automatic blunders");
for (const requestedId of ["xr-jt-gutshot", "xr-qt-gutshot", "xr-qj-gutshot", "xr-k9-two-pair", "xr-k2-two-pair", "xr-99-set", "xr-22-set"]) {
  assert(byId.has(requestedId), `${requestedId} from the lesson brief is present`);
}

assert.equal(data.examples.tree, "bb_vs_late_rfi");
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
  assert.match(example.representativeNote, /общий X\/R.*не подставляется/i);
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
  assert.equal(example.evidence.status, "pending_exact_extract");
  assert.match(example.evidence.scope, /made-hand\/draw category/i);
  assert(example.evidence.categoryKey, `${example.id} has a stable category key`);
  assert(example.evidence.categoryLabel, `${example.id} has a user-facing category label`);
  for (const leagueKey of ["league1", "league2", "league3"]) {
    const row = example.evidence[leagueKey];
    assert.deepEqual(
      [row.xraises, row.opportunities, row.players],
      [null, null, null],
      `${example.id}.${leagueKey} does not reuse the overall node rate`
    );
    assert.match(row.note, /reverse-Hero|тот же category denominator/i);
  }
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
assert.match(data.examples.lead, /восемь реальных раздач Лиги 1.*пять учебных категорий/i);
assert.match(data.examples.method, /восемь реально сыгранных X\/R.*не задаёт частоту или рекомендацию/i);
assert.match(data.examples.bluff[0].contrast.copy, /один слабый backdoor.*эксплойт.*два пути усиления/i);
assert.match(data.examples.bluff[1].contrast.copy, /один runner-runner.*эксплойт.*gutshot/i);

assert.match(html, /data-intro-table/);
assert.match(html, /data-step-target="examples"/);
assert.match(html, /data-examples-league-one/, "the Examples tab has a dedicated observed League 1 host");
assert.match(shared, /observedLeague1/, "the shared lesson renderer reads the observed League 1 data contract");
assert.match(shared, /data-examples-league-one/, "the shared lesson renderer mounts the observed League 1 cards separately");
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
assert.match(html, new RegExp(`field-matrix\\.css\\?v=${fieldMatrixCssHash}`));
assert.match(html, new RegExp(`field-matrix\\.js\\?v=${fieldMatrixHash}`));
assert.match(html, /simulator-continuation\.js\?v=20260716-full-hand-1/);
assert.match(html, /poker-flop-checkraise-lesson\/continuations\.js\?v=e5a2e89fd1c0/);
assert.doesNotMatch(html, /data-cohort-cards/, "check-raise field tab is now structure-first rather than four aggregate cards");
assert.ok(html.indexOf("simulator-snapshot.js") < html.indexOf("poker-flop-checkraise-lesson/data.js"));
assert.ok(html.indexOf("simulator-practice.js") < html.indexOf("simulator-continuation.js"));
assert.ok(html.indexOf("simulator-continuation.js") < html.indexOf("poker-flop-checkraise-lesson/continuations.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/continuations.js") < html.indexOf("poker-flop-checkraise-lesson/data.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/practice-generator.js") < html.indexOf("poker-flop-checkraise-lesson/data.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/data.js") < html.indexOf("poker-flop-checkraise-lesson/field-matrix.js"));
assert.ok(html.indexOf("poker-flop-checkraise-lesson/field-matrix.js") < html.indexOf("poker-field-lesson/lesson.js"));
assert.match(fieldMatrixSource, /Нам ставят c-bet/);
assert.match(fieldMatrixSource, /CO\/BTN ставит c-bet в BB/);
assert.match(fieldMatrixSource, /appendKpi\(metrics, "Нам ставят"/);
assert.doesNotMatch(fieldMatrixSource, /appendKpi\(metrics, "C-bet"/);
assert.match(fieldMatrixSource, /Фолд на X\/R/);
assert.match(fieldMatrixSource, /dataset\.foldView/);
assert.equal((fieldMatrixSource.match(/showSample: false/g) || []).length, 2, "the structure table hides both raw sample counters");
assert.doesNotMatch(fieldMatrixSource, /Как читать N:/, "the table no longer keeps an obsolete sample-size footer");
assert.match(fieldMatrixCss, /structure-league-table\s*\{[\s\S]*?min-width:\s*0;/, "the desktop matrix has no artificial horizontal floor");
assert.match(fieldMatrixCss, /structure-league-table th,[\s\S]*?padding:\s*8px;/, "desktop matrix rows stay compact");
assert.match(fieldMatrixCss, /thead th:first-child\s*\{\s*width:\s*20%;/, "the structure column yields space to all three leagues");
assert.match(fieldMatrixCss, /thead th:not\(:first-child\)\s*\{\s*width:\s*26\.6667%;/, "the three league columns share the remaining width exactly");
assert.match(fieldMatrixCss, /structure-league-table \.structure-league-cell-metrics\s*\{\s*gap:\s*6px;/, "desktop league KPIs use the compact table gap");
assert.match(fieldMatrixCss, /--structure-league-accent:/, "each league pair receives its own restrained visual accent");
assert.match(
  fieldMatrixCss,
  /structure-league-table thead th:not\(:first-child\)[\s\S]*?box-shadow:\s*inset 0 -2px 0 rgba\(var\(--structure-league-accent\), \.42\);/,
  "league headers visibly cap their paired metric columns"
);
assert.match(
  fieldMatrixCss,
  /structure-league-table \.structure-league-cell-metrics[\s\S]*?border:\s*1px solid rgba\(var\(--structure-league-accent\), \.20\);[\s\S]*?box-shadow:/,
  "both metrics sit inside one shared league frame"
);
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
  assert.match(
    fieldMatrixCss,
    new RegExp(`wisdom-slide\\.has-value-range-slide[\\s\\S]*?\\.${annotationClass}[\\s\\S]*?display:\\s*none;`),
    `${annotationClass} stays hidden in the picture-only K92 range`
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
invalidField.role = "checkraiser";
invalidField.rows = invalidField.rows.filter((row) => row.key !== "monotone");
invalidField.rows[0].values.league1.cbet.made = invalidField.rows[0].values.league1.cbet.opportunities + 1;
invalidField.rows[1].values.league2.foldVsXr.overall.folds = invalidField.rows[1].values.league2.foldVsXr.overall.faced + 1;
invalidField.rows[2].values.league3.foldVsXr.matched.faced = invalidField.rows[2].values.league3.foldVsXr.overall.faced + 1;
const invalidFieldErrors = Array.from(validateFieldMatrix(invalidField).errors);
assert(invalidFieldErrors.some((error) => /role должен быть aggressor/.test(error)));
assert(invalidFieldErrors.some((error) => /восемь взаимоисключающих структур/.test(error)));
assert(invalidFieldErrors.some((error) => /неверные c-bet counts/.test(error)));
assert(invalidFieldErrors.some((error) => /неверные fold-vs-X\/R counts/.test(error)));
assert(invalidFieldErrors.some((error) => /matched N больше overall N/.test(error)));

const rateFeedback = runtimeContext.window.FFPokerFieldLesson.practiceRateFeedbackFor;
const decisionOutcome = runtimeContext.window.FFPokerFieldLesson.decisionOutcomeFor;
const gutshotSession = context.window.FFFlopCheckraisePracticeGenerator.createSession({ seed: "diagnose-86s-k95" });
let gutshotSpot = null;
while (!gutshotSpot || gutshotSpot.practiceMeta.serial < 18) gutshotSpot = gutshotSession.next();
assert.equal(gutshotSpot.practiceMeta.archetype, "thin-gutshot");
assert.equal(
  decisionOutcome(gutshotSpot.options.find((option) => option.key === "checkraise"), gutshotSpot.options.find((option) => option.correct)),
  "alternative",
  "the 86s gutshot check-raise is accepted as a mix rather than graded as an error"
);
const kqJ72Session = context.window.FFFlopCheckraisePracticeGenerator.createSession({ seed: "kq-j72-btnshot-1653" });
let kqJ72Spot = null;
while (!kqJ72Spot || kqJ72Spot.practiceMeta.serial < 58) kqJ72Spot = kqJ72Session.next();
assert.deepEqual(Array.from(kqJ72Spot.table.heroCards), ["Kc", "Qs"]);
assert.deepEqual(Array.from(kqJ72Spot.table.boardCards), ["Js", "7d", "2h"]);
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
incomplete.practiceGenerator.global = "";
incomplete.wisdom[1].visual.boardCards[1] = "Kc";
incomplete.wisdom[1].visual.groups[1].hands.push({ label: "K9", cards: ["Kh", "9s"] });
incomplete.wisdom[1].visual.groups[0].hands[0].cards = ["Kc", "9c"];
incomplete.wisdom[1].visual.note = "";
incomplete.wisdom[2].visual.boardCards[1] = "Kc";
incomplete.wisdom[2].visual.sizing.checkraise = "";
incomplete.wisdom[2].visual.rows = incomplete.wisdom[2].visual.rows.filter((row) => row.key !== "league2");
incomplete.wisdom[2].visual.rows[0].folds = incomplete.wisdom[2].visual.rows[0].faced + 1;
const incompleteErrors = runtimeContext.window.FFPokerFieldLesson.validateData(incomplete).errors;
assert(incompleteErrors.some((error) => /actions\[0\]: нет pct/.test(error)), "missing pct is rejected");
assert(incompleteErrors.some((error) => /tree должен быть bb_vs_late_rfi/.test(error)), "wrong example tree is rejected");
assert(incompleteErrors.some((error) => /playbook: нет bestTurns/.test(error)), "empty example turn plan is rejected");
assert(incompleteErrors.some((error) => /practiceGenerator\.global/.test(error)), "missing procedural provider global is rejected");
assert(incompleteErrors.some((error) => /три уникальные валидные карты/.test(error)), "duplicate board card is rejected");
assert(incompleteErrors.some((error) => /рука K9 повторяется/.test(error)), "duplicate value hand is rejected");
assert(incompleteErrors.some((error) => /две валидные карты без конфликта/.test(error)), "value example cannot reuse a board card");
assert(incompleteErrors.some((error) => /нет note/.test(error)), "missing value-range explanation is rejected");
assert(incompleteErrors.some((error) => /нет checkraise/.test(error)), "missing shared size scope is rejected");
assert(incompleteErrors.some((error) => /нужны league1, league2, league3/.test(error)), "missing league row is rejected");
assert(incompleteErrors.some((error) => /неверные folds\/faced/.test(error)), "folds above faced are rejected");

console.log("flop check-raise lesson contract: ok");
