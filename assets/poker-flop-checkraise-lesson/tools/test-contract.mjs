import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const [html, source, shared, sharedCss, continuationDataSource, practiceGeneratorSource, continuationControllerSource, sizeMatchedCsv, fieldMatrixSource, fieldMatrixCss, fieldMatrixCsv] = await Promise.all([
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
  readFile(path.join(root, "assets/poker-flop-checkraise-lesson/research/structure-league-field-matrix.csv"), "utf8")
]);

const context = { window: {} };
vm.runInNewContext(continuationDataSource, context, { filename: "poker-flop-checkraise-lesson/continuations.js" });
vm.runInNewContext(practiceGeneratorSource, context, { filename: "poker-flop-checkraise-lesson/practice-generator.js" });
vm.runInNewContext(source, context, { filename: "poker-flop-checkraise-lesson/data.js" });
const data = context.window.FF_POKER_FIELD_LESSON_DATA;

assert.equal(data.schemaVersion, 1);
assert.equal(data.key, "flop-checkraise");
assert.equal(data.wisdom.length, 3);
assert.equal(data.wisdom[1].rule, undefined, "the second wisdom slide has no extra rule callout");
assert.equal(data.wisdom[2].rule, undefined, "the third wisdom slide has no extra rule callout");
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
assert.equal(field.sample.kind, "deterministic_hh_sample");
assert.equal(field.sample.percent, 70);
assert.equal(field.sample.analysisIncluded, true);
assert.deepEqual(
  [field.sample.compactRows, field.sample.parsedRows, field.sample.rankedRows, field.sample.coBtnRows, field.sample.positionParseErrors],
  [2300854, 2297953, 2256311, 1267631, 21]
);
assert.match(field.definitions.cbet, /ставки CO\/BTN.*возможности/i);
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

assert.match(data.wisdom[2].copy, /43%/);
const foldVisual = data.wisdom[2].visual;
assert.equal(foldVisual.type, "board-folds");
assert.equal(foldVisual.cohortRole, "aggressor");
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
assert.match(shared, /pluralRu\(folds, "фолд", "фолда", "фолдов"\)/, "field evidence uses Russian plural forms for fold counts");
assert.match(byId.get("fold-j5-weak-backdoor").options.find((option) => option.key === "checkraise").feedback, /эксплойт.*оверфолд.*дисциплинированнее/i);
assert.match(byId.get("fold-t8-backdoor-only").answer, /эксплойт.*gutshot.*один.*runner-runner/i);
assert.doesNotMatch(source, /Лишн(?:ий|их) (?:check-raise|рейз|X\/R)/i, "optimistic check-raises are not framed as automatic blunders");
for (const requestedId of ["xr-jt-gutshot", "xr-qt-gutshot", "xr-qj-gutshot", "xr-k9-two-pair", "xr-k2-two-pair", "xr-99-set", "xr-22-set"]) {
  assert(byId.has(requestedId), `${requestedId} from the lesson brief is present`);
}

assert.equal(data.examples.tree, "bb_vs_late_rfi");
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
assert.match(data.examples.lead, /пять категорий.*когда рейзить.*тёрне/i);
assert.match(data.examples.method, /примеры учебные.*точных частот/i);
assert.match(data.examples.bluff[0].contrast.copy, /один слабый backdoor.*эксплойт.*два пути усиления/i);
assert.match(data.examples.bluff[1].contrast.copy, /один runner-runner.*эксплойт.*gutshot/i);

assert.match(html, /data-intro-table/);
assert.match(html, /data-step-target="examples"/);
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
assert.match(html, /ca84428f46bf/);
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
assert.match(html, /field-matrix\.css\?v=20260716-structures-1/);
assert.match(html, /field-matrix\.js\?v=20260716-structures-1/);
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
assert.match(fieldMatrixSource, /C-bet после чека/);
assert.match(fieldMatrixSource, /Фолд на X\/R/);
assert.match(fieldMatrixSource, /dataset\.foldView/);
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
assert(incompleteErrors.some((error) => /нет checkraise/.test(error)), "missing shared size scope is rejected");
assert(incompleteErrors.some((error) => /нужны league1, league2, league3/.test(error)), "missing league row is rejected");
assert(incompleteErrors.some((error) => /неверные folds\/faced/.test(error)), "folds above faced are rejected");

console.log("flop check-raise lesson contract: ok");
