import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { validateCurrentBenchmarkTemplates } from "./source-template-readiness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const assetRoot = resolve(root, "assets/poker-preflop-benchmark");
const pages = ["vs-one-raiser-positions-lesson.html", "vs-one-raiser-sb-lesson.html", "sb-unopened-lesson.html"];
const context = { window: {} };
vm.createContext(context);
for (const file of ["assets/poker-trainer-shell/simulator-snapshot.js", "assets/poker-preflop-benchmark/readiness.js", "assets/poker-preflop-benchmark/field-data.js", "assets/poker-preflop-benchmark/spot-ev-data.js", "assets/poker-preflop-benchmark/config.js"]) {
  vm.runInContext(readFileSync(resolve(root, file), "utf8"), context);
}
const readinessContract = context.PokerPreflopBenchmarkReadiness;
const data = context.window.PokerPreflopBenchmarkData;
const evData = context.window.PokerPreflopBenchmarkEvData;
const config = context.window.PokerPreflopBenchmarkConfig;
const lessonSource = readFileSync(resolve(assetRoot, "lesson.js"), "utf8");
const rankSql = readFileSync(resolve(assetRoot, "tools/msp-preflop-rank-bridge.sql"), "utf8");
const actionSql = readFileSync(resolve(assetRoot, "tools/msp-preflop-action-cube.sql"), "utf8");
const evSql = readFileSync(resolve(assetRoot, "tools/msp-sb-vs-btn-ev.sql"), "utf8");

const sha256 = (source) => createHash("sha256").update(source).digest("hex");
assert.equal(readinessContract.sha256("abc"), sha256("abc"), "browser-safe SHA-256 matches Node");
const parseCsv = (source) => {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/);
  const header = headerLine.split(",");
  return lines.filter(Boolean).map((line) => Object.fromEntries(line.split(",").map((value, index) => [header[index], value])));
};
const evaluate = (source, key) => {
  const generated = { window: {} };
  vm.createContext(generated);
  vm.runInContext(source, generated);
  return generated.window[key];
};

// The checked-in product has exactly two legal states: an empty methodology
// sentinel, or one complete provenance-bound full-window publication.
const publishedReadiness = readinessContract.validateBenchmarkData(data, evData);
const checkedInMethodology = data.source.availability === "methodology_only"
  && evData.source.availability === "methodology_only";
assert(
  checkedInMethodology || publishedReadiness.ready,
  `checked-in benchmark data is neither a methodology sentinel nor ready: ${publishedReadiness.reasons.slice(0, 4).join("; ")}`
);
assert.equal(data.source.handMinimum, 50);
assert.deepEqual({ ...data.source.nearFloorException }, { ...readinessContract.NEAR_FLOOR_EXCEPTION });
assert.equal(data.source.requiredHandsPerChart, 169);
assert.equal(data.source.publicationPolicy, readinessContract.PUBLICATION_POLICY);
assert.equal(data.source.selectorMode, readinessContract.SELECTOR_MODE);
assert.equal(data.source.rankSemantics, "rank_at_hand");
assert.deepEqual(Array.from(data.source.cohorts.league1), [1, 5]);
assert.deepEqual(Array.from(data.source.cohorts.leagues2_3), [6, 14]);
assert.deepEqual(Array.from(data.source.cohorts.r15_18), [15, 18]);
if (checkedInMethodology) {
  assert.equal(data.source.partialSourcesPublished, false);
  for (const trainer of Object.values(data.trainers)) assert.deepEqual(Array.from(trainer.slices), []);
  assert.equal(evData.source.partialSourcesPublished, false);
  assert.deepEqual(Object.keys(evData.spots), []);
  assert.equal(publishedReadiness.ready, false, "methodology sentinels cannot pass the shared gate");
  assert(publishedReadiness.reasons.length < 40, "methodology sentinels fail fast without enumerating the unpublished matrix");
} else {
  const sourceTemplates = validateCurrentBenchmarkTemplates(root, data, evData);
  assert.equal(sourceTemplates.ready, true, sourceTemplates.reasons.join("; "));
  assert(Object.values(data.trainers).every((trainer) => trainer.slices.length > 0), "ready benchmark trainers expose observed slices");
  assert(Object.keys(evData.spots).length > 0, "ready benchmark publication exposes EV spots");
  assert.equal(data.source.publishedSpotMatrix.vs_raise_free.length, 125);
  assert.equal(data.source.publishedSpotMatrix.vs_raise_sb.length, 42);
  assert.equal(data.source.publishedSpotMatrix.sb_unopened.length, 10);
  assert(data.source.publishedSpotMatrix.sb_unopened.includes("SB|—|—|<6"), "unopened-SB catalog keeps the requested <6 BB chart");

  const reviewedFieldSemantics = Object.keys(data.trainers).sort().map((trainerKey) => [
    trainerKey,
    data.trainers[trainerKey].slices.map((slice) => ({
      cohort: slice.cohort,
      hero: slice.hero_position,
      opener: slice.opener_position,
      size: slice.open_size,
      stack: slice.stack_bucket,
      counts: Array.from(slice.handActionCounts),
    })).sort((left, right) =>
      [left.cohort, left.hero, left.opener, left.size, left.stack].join("|")
        .localeCompare([right.cohort, right.hero, right.opener, right.size, right.stack].join("|"))
    ),
  ]);
  assert.equal(
    reviewedFieldSemantics.reduce((total, [, slices]) =>
      total + slices.reduce((sliceTotal, slice) => sliceTotal + slice.counts.length, 0), 0),
    358956,
    "the reviewed field cube keeps every action count for 531 complete 169-hand cohort charts"
  );
  assert.equal(
    sha256(JSON.stringify(reviewedFieldSemantics)),
    "7e2c6fd000cf1a67357fe2ca0e29223ae37acded9a099fbf49a1cc97df10be6d",
    "the reviewed hand-level field cube cannot be self-signed after a cell mutation"
  );
}
assert.equal(config.shared.cohorts.r15_18, "Ранги 15–18");
assert(!JSON.stringify(config.shared.cohorts).includes("Нович"), "rank 15-18 cohort is not mislabeled as novices");
assert(lessonSource.includes("readiness.ready === true"), "observed UI requires the shared readiness contract");
assert(lessonSource.includes('? ["hand", "main", "wisdom"]'), "methodology-only navigation has an explicit allowlist");
assert(lessonSource.includes('if (!availableScreens.includes(screen)) screen = "main"'), "saved links cannot reopen a data-only screen");
assert(!lessonSource.includes(' : "Новички"'), "rank 15-18 learner badge is not labeled novices");
assert(lessonSource.includes("var methodologyRule = item.rule ?"), "methodology proof omits an empty rule caption");
assert(lessonSource.includes("var rule = item.rule ?"), "wisdom slide omits an empty rule callout");
assert(!lessonSource.includes('disabled aria-disabled="true" title="Нет полного сравнения'),
  "contextual chart selectors never render disabled source states");
assert(!lessonSource.includes('findSlice("league1", shortFilters) || league')
  && !lessonSource.includes('findSlice("r15_18", shortFilters) || novice'),
  "the short-stack wisdom cannot substitute the currently selected deep charts");
assert(lessonSource.includes("Глубокие матрицы здесь не подставляем"),
  "the short-stack wisdom fails closed when the exact short comparison is unavailable");
assert.equal(config.shared.preflopPotBb(0, 1), 2.5);
assert.equal(config.shared.preflopPotBb(2, 1), 4.5);
assert.equal(config.shared.preflopPotBb(2, 1, "SB"), 4);
assert.equal(config.shared.representativeStackBb("sb_unopened", "6-8", data.source), 7);
assert.equal(config.shared.representativeStackBb("sb_unopened", "<6", data.source), 4.5);
assert.equal(config.shared.representativeStackBb("vs_raise_free", "30", data.source), 30);
assert.notEqual(
  config.shared.representativeStackBb("sb_unopened", "6-8", data.source),
  config.shared.representativeStackBb("sb_unopened", "<6", data.source),
  "adjacent short-stack buckets render distinct representative stacks",
);
assert.deepEqual(Array.from(config.trainers.vs_raise_sb.comparisonCohorts), ["league1", "leagues2_3", "r15_18"]);
assert.deepEqual(
  JSON.parse(JSON.stringify(config.trainers.vs_raise_sb.observedOutcomeSensitivity)),
  {
    gapMinBb100: 5,
    gapMaxBb100: 9.8,
    note: "Историческая проверка чувствительности на разных допустимых отрезках данных; это не доверительный интервал."
  }
);
assert(lessonSource.includes("Разрыв наблюдается, но причина не доказана"));
assert(lessonSource.includes("Это описательная связь групп, а не доказательство, что весь разрыв вызван лишними коллами."));
assert(!lessonSource.includes("Столько ранги 15–18 недобирают относительно первой лиги"));
assert.deepEqual(Array.from(config.trainers.sb_unopened.comparisonCohorts), ["league1", "leagues2_3", "r15_18"]);
assert(lessonSource.includes('acceptableMix: action !== item.expected && Number(item.league && item.league[action] || 0) >= 30'),
  "practice exposes a soft mix when the alternative reaches 30%");
assert(lessonSource.includes("cellOpportunities[hand] || 0) < handMinimum"),
  "categorical practice excludes below-floor hand cells");
assert(!lessonSource.includes('label += unopened ? " 3 BB"'), "unopened-SB practice never invents a raise size");
assert(lessonSource.includes('anteMode: "table"'), "benchmark practice attributes the total ante across the table");
for (const page of pages) {
  const html = readFileSync(resolve(root, page), "utf8");
  const readinessVersion = sha256(readFileSync(resolve(assetRoot, "readiness.js"))).slice(0, 12);
  const fieldDataVersion = sha256(readFileSync(resolve(assetRoot, "field-data.js"))).slice(0, 12);
  const spotEvVersion = sha256(readFileSync(resolve(assetRoot, "spot-ev-data.js"))).slice(0, 12);
  assert(html.includes("assets/poker-preflop-benchmark/field-data.js"));
  assert(html.includes("assets/poker-preflop-benchmark/spot-ev-data.js"));
  assert(html.includes("assets/poker-preflop-benchmark/readiness.js"));
  assert(html.includes(`assets/poker-preflop-benchmark/field-data.js?v=${fieldDataVersion}`), `${page}: field-data cache token matches the exact aggregate bytes`);
  assert(html.includes(`assets/poker-preflop-benchmark/spot-ev-data.js?v=${spotEvVersion}`), `${page}: spot-EV cache token matches the exact aggregate bytes`);
  assert(html.includes(`assets/poker-preflop-benchmark/readiness.js?v=${readinessVersion}`), `${page}: readiness cache token matches the exact runtime bytes`);
  assert(html.indexOf("assets/poker-preflop-benchmark/readiness.js") < html.indexOf("assets/poker-preflop-benchmark/lesson.js"), `${page}: readiness loads before the lesson runtime`);
  if (checkedInMethodology) {
    assert.equal((html.match(/<button class="step-tab\b/g) || []).length, 3, `${page}: methodology-only page exposes exactly three neutral steps`);
    for (const screen of ["ranges", "field", "practice"]) {
      assert(!html.includes(`data-screen="${screen}"`), `${page}: ${screen} screen is not shipped without ready field data`);
      assert(!html.includes(`data-go="${screen}"`), `${page}: ${screen} CTA/tab is not shipped without ready field data`);
    }
    assert(!/(Первая лига|первой лиги|Ранги 15–18|ранги 15–18|2–3 лиги|реальные данные MSP|точные срезы MSP|Посмотреть чарт|Сразу попробовать)/.test(html), `${page}: methodology-only HTML carries no cohort, observed-data, chart, or practice promise`);
  } else {
    assert.equal((html.match(/<button class="step-tab\b/g) || []).length, 6, `${page}: ready page exposes the full six-step lesson`);
    for (const screen of ["ranges", "field", "practice"]) {
      assert(html.includes(`data-screen="${screen}"`), `${page}: ready publication includes the ${screen} screen`);
      assert(html.includes(`data-go="${screen}"`), `${page}: ready publication includes navigation to ${screen}`);
    }
  }
}

for (const trainerClass of ["trainer-card-sb-open", "trainer-card-vs-raiser", "trainer-card-vs-raiser-sb"]) {
  const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
  const start = indexHtml.indexOf(`<article class="trainer-card ${trainerClass}">`);
  const end = indexHtml.indexOf("</article>", start);
  const card = indexHtml.slice(start, end);
  assert(start >= 0 && end > start, `lobby contains ${trainerClass}`);
  if (checkedInMethodology) {
    assert(card.includes("чарты и практика — на проверке"), `${trainerClass}: lobby reports verification status`);
    assert(card.includes("полевые данные пока не публикуются"), `${trainerClass}: lobby does not promise observed data`);
    assert(card.includes("Открыть методику"), `${trainerClass}: lobby CTA describes the available surface`);
  } else {
    assert(!card.includes("на проверке") && !card.includes("пока не публикуются"), `${trainerClass}: ready lobby card has no stale pending copy`);
    assert(card.includes("Открыть тренажёр"), `${trainerClass}: ready lobby CTA describes the full surface`);
  }
}

// Query contracts: candidate ids may narrow the scan, but latest tracker
// versions are selected before the business filters are applied again.
for (const sql of [actionSql, evSql]) {
  const candidate = sql.indexOf("candidate_ids AS (");
  const latest = sql.indexOf("latest AS (");
  const filtered = sql.indexOf("filtered AS (");
  assert(candidate >= 0 && latest > candidate && filtered > latest);
  assert(sql.slice(latest, filtered).includes("INNER JOIN candidate_ids AS c USING (hand_player_id)"));
  assert(sql.slice(filtered).includes("x.4 BETWEEN 7 AND 9") || sql.slice(filtered).includes("x.11 BETWEEN 7 AND 9"));
  assert(sql.includes("GROUP BY h.hand_player_id"));
  for (const placeholder of ["{{RANK_USER_IDS}}", "{{WINDOW_START}}", "{{WINDOW_END_EXCLUSIVE}}", "{{WINDOW_MONTH_START}}", "{{WINDOW_MONTH_END_EXCLUSIVE}}"] ) {
    assert(sql.includes(placeholder), `query template keeps ${placeholder}`);
  }
}
assert(actionSql.includes("x.15 - x.16 >= x.8 - 0.01"));
assert(evSql.includes("x.9 - x.10 >= x.8 - 0.01"));
assert(evSql.includes("sum(toFloat64(x.3) / toFloat64(x.4)) AS ev_sum_bb"));
assert(evSql.includes("private_player_ids"), "EV time shards carry merge-only exact player ids");
assert(evSql.includes("raw shard CSVs must stay outside the repository"));
assert(rankSql.includes("WHERE h.rang BETWEEN 1 AND 18"), "one canonical rank bridge covers every compared cohort");
assert(actionSql.includes("msp-preflop-rank-bridge.sql"));
assert(evSql.includes("msp-preflop-rank-bridge.sql"));
assert(!actionSql.includes("mcp__check_rank_history") && !evSql.includes("mcp__check_rank_history"), "action and EV templates cannot drift into separate rank exports");

function coversEffectiveStack(row) {
  return row.raiseAndBlindBb != null && Number(row.raiseAndBlindBb) - Number(row.postedBlindBb || 0) >= Number(row.effectiveStackBb) - 0.01;
}
function classify(row) {
  const action = String(row.action || "");
  if (action === "R" && (Number(row.allin || 0) === 1 || coversEffectiveStack(row))) return "jam";
  if (action.startsWith("R")) return "raise";
  if (action.startsWith("C")) return "call";
  if (action === "F") return "fold";
  return "other";
}
assert.equal(classify({ action: "R", allin: 0, raiseAndBlindBb: 6, postedBlindBb: .5, effectiveStackBb: 5.5 }), "jam");
assert.equal(classify({ action: "R", allin: 0, raiseAndBlindBb: 3, postedBlindBb: .5, effectiveStackBb: 5.5 }), "raise");
assert.equal(classify({ action: "RC", allin: 1, raiseAndBlindBb: 12.5, postedBlindBb: .5, effectiveStackBb: 12 }), "raise");

const fixtureDir = mkdtempSync(resolve(tmpdir(), "ff-preflop-benchmark-contract-"));
try {
  const rankPath = resolve(fixtureDir, "rank.csv");
  writeFileSync(rankPath, [
    "user_id,rang,rank_start_at,rank_end_at",
    "8,3,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "9,16,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "16,4,2024-01-01 00:00:00,2024-01-01 00:00:00",
    "",
  ].join("\n"));
  const renderedAction = execFileSync(process.execPath, [resolve(assetRoot, "tools/render-action-cube-query.mjs"), rankPath, "--shards=1", "--shard=0", "--window-start=2023-09-01 00:00:00", "--window-end=2025-01-01 00:00:00", "--quiet=true"], { encoding: "utf8" });
  assert(renderedAction.includes("PREWHERE h.user_id IN (8,9)"));
  assert(renderedAction.includes("(9,16,"));
  assert(!renderedAction.includes("(16,4,"));
  assert(!renderedAction.includes("{{"));
  const renderedEv = execFileSync(process.execPath, [resolve(assetRoot, "tools/render-action-cube-query.mjs"), rankPath, "--shards=1", "--shard=0", "--template=ev", "--window-start=2023-09-01 00:00:00", "--window-end=2025-01-01 00:00:00", "--quiet=true"], { encoding: "utf8" });
  assert(renderedEv.includes("private_player_ids"));
  assert(!renderedEv.includes("{{"));
  assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/render-action-cube-query.mjs"), rankPath, "--shards=8", "--shard=0", "--quiet=true"], { stdio: "pipe" }), /time-shard publication requires the full rank bridge/);

  const actionHeader = "trainer,cohort,hero_position,opener_position,open_size,stack_bucket,hand_class,opportunities,folds,calls,raises,jams,other,players,months,first_hand_at,last_hand_at";
  const actionA = resolve(fixtureDir, "action-a.csv");
  const actionB = resolve(fixtureDir, "action-b.csv");
  const actionMerged = resolve(fixtureDir, "action-merged.csv");
  const actionMergeMetadata = resolve(fixtureDir, "action-merge.json");
  writeFileSync(actionA, `${actionHeader}\nvs_raise_free,league1,BTN,HJ,2x,30,AA,50,5,10,20,15,0,3,1,2023-09-01 00:00:00,2024-01-01 00:00:00\n`);
  writeFileSync(actionB, `${actionHeader}\nvs_raise_free,league1,BTN,HJ,2x,30,AA,50,10,5,15,20,0,4,2,2024-01-02 00:00:00,2026-07-21 23:59:59\n`);
  const corruptAction = resolve(fixtureDir, "action-corrupt.csv");
  writeFileSync(corruptAction, readFileSync(actionA, "utf8").replace(",50,5,10,", ",not-a-count,5,10,"));
  assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/merge-action-cube-shards.mjs"), actionA, actionB, "--output", actionMerged], { stdio: "pipe" }), /--partition/);
  assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/merge-action-cube-shards.mjs"), corruptAction, actionB, "--partition", "time", "--output", actionMerged], { stdio: "pipe" }), /opportunities must be a non-negative integer/);
  execFileSync(process.execPath, [resolve(assetRoot, "tools/merge-action-cube-shards.mjs"), actionA, actionB, "--partition", "time", "--output", actionMerged, "--metadata", actionMergeMetadata], { stdio: "ignore" });
  const [actionRow] = parseCsv(readFileSync(actionMerged, "utf8"));
  assert.deepEqual([actionRow.opportunities, actionRow.folds, actionRow.calls, actionRow.raises, actionRow.jams], ["100", "15", "15", "35", "35"]);
  assert(!readFileSync(actionMerged, "utf8").split(/\r?\n/, 1)[0].includes("players"));
  const actionMeta = JSON.parse(readFileSync(actionMergeMetadata, "utf8"));
  assert.equal(actionMeta.schema, "ff-preflop-benchmark-action-merge-v1");
  assert.equal(actionMeta.partitionAxis, "time");

  const evHeader = "cohort,hand_class,opportunities,players,private_player_ids,spot_ev_bb_100,ev_sum_bb,folds,calls,raises,jams,fold_pct,call_pct,raise_pct,jam_pct";
  const evA = resolve(fixtureDir, "ev-a.csv");
  const evB = resolve(fixtureDir, "ev-b.csv");
  const evMerged = resolve(fixtureDir, "ev-merged.csv");
  const evMergeMetadata = resolve(fixtureDir, "ev-merge.json");
  writeFileSync(evA, `${evHeader}\nleague1,__SPOT__,2,2,101;102,50.00,1,1,1,0,0,50.0,50.0,0.0,0.0\n`);
  writeFileSync(evB, `${evHeader}\nleague1,__SPOT__,3,2,102;103,100.00,3,0,1,1,1,0.0,33.3,33.3,33.3\n`);
  const corruptEv = resolve(fixtureDir, "ev-corrupt.csv");
  writeFileSync(corruptEv, readFileSync(evA, "utf8").replace(",50.00,1,", ",50.00,not-an-ev,"));
  assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/merge-spot-ev-shards.mjs"), evA, evB, "--output", evMerged], { stdio: "pipe" }), /--partition/);
  assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/merge-spot-ev-shards.mjs"), corruptEv, evB, "--partition", "time", "--output", evMerged], { stdio: "pipe" }), /ev_sum_bb must be finite/);
  execFileSync(process.execPath, [resolve(assetRoot, "tools/merge-spot-ev-shards.mjs"), evA, evB, "--partition", "time", "--output", evMerged, "--metadata", evMergeMetadata], { stdio: "ignore" });
  const [evRow] = parseCsv(readFileSync(evMerged, "utf8"));
  assert.deepEqual([evRow.opportunities, evRow.players, evRow.spot_ev_bb_100, evRow.ev_sum_bb], ["5", "3", "80.00", "4.000000000000"]);
  assert(!readFileSync(evMerged, "utf8").includes("private_player_ids"));
  const evMeta = JSON.parse(readFileSync(evMergeMetadata, "utf8"));
  assert.deepEqual(evMeta.playerCardinality, { method: "exact_union_private_user_ids", privateIdentifiersDiscarded: true });
  assert(!JSON.stringify(evMeta).includes("101") && !JSON.stringify(evMeta).includes("102") && !JSON.stringify(evMeta).includes("103"));

  const ranks = "AKQJT98765432";
  const hands = [];
  for (let first = 0; first < ranks.length; first += 1) {
    hands.push(`${ranks[first]}${ranks[first]}`);
    for (let second = first + 1; second < ranks.length; second += 1) hands.push(`${ranks[first]}${ranks[second]}s`, `${ranks[first]}${ranks[second]}o`);
  }
  assert.equal(new Set(hands).size, 169);
  const actionTemplateHash = sha256(actionSql);
  const rankTemplateHash = sha256(rankSql);
  for (const [label, weak, expectedSlices] of [["weak", true, 0], ["exact", false, 3]]) {
    const cubePath = resolve(fixtureDir, `${label}-cube.csv`);
    const cubeSource = `${actionHeader}\n${["league1", "leagues2_3", "r15_18"].flatMap((cohort) => hands.map((hand) => {
      const opportunities = weak && cohort === "r15_18" && hand === "32o" ? 49 : 50;
      return ["vs_raise_free", cohort, "BTN", "HJ", "2x", "30", hand, opportunities, opportunities, 0, 0, 0, 0, 10, 1, "2023-09-01 00:00:00", "2026-07-21 23:59:59"].join(",");
    })).join("\n")}\n`;
    writeFileSync(cubePath, cubeSource);
    const manifestPath = resolve(fixtureDir, `${label}-manifest.json`);
    const q0 = sha256(`${label}-query-0`), q1 = sha256(`${label}-query-1`);
    writeFileSync(manifestPath, `${JSON.stringify({
      schema: "ff-preflop-benchmark-action-cube-source-v1",
      analysisWindow: { startInclusive: "2023-09-01T00:00:00Z", endExclusive: "2026-07-22T00:00:00Z" },
      rankBridge: {
        queryJobId: "mcp_bq_job_0123456789abcdef",
        executionMode: "async",
        sha256: sha256("rank"),
        rows: 2,
        usableRows: 2,
        byteSize: 4,
        truncated: false,
        queryTemplate: { file: "tools/msp-preflop-rank-bridge.sql", sha256: rankTemplateHash },
      },
      queryTemplate: { file: "tools/msp-preflop-action-cube.sql", sha256: actionTemplateHash },
      partitionAxis: "time",
      shards: [
        { shardIndex: 0, shardCount: 2, queryJobId: `sync:${q0}`, executionMode: "sync", querySha256: q0, resultSha256: sha256(`${label}-result-0`), rowCount: 507, byteSize: 10, truncated: false, durationMs: 10, windowStartInclusive: "2023-09-01T00:00:00Z", windowEndExclusive: "2025-01-01T00:00:00Z" },
        { shardIndex: 1, shardCount: 2, queryJobId: `sync:${q1}`, executionMode: "sync", querySha256: q1, resultSha256: sha256(`${label}-result-1`), rowCount: 507, byteSize: 10, truncated: false, durationMs: 10, windowStartInclusive: "2025-01-01T00:00:00Z", windowEndExclusive: "2026-07-22T00:00:00Z" },
      ],
      merged: { sha256: sha256(cubeSource), rows: 507, opportunities: weak ? 25349 : 25350 },
      coverage: {
        minimumHandOpportunities: readinessContract.MIN_HAND_OPPORTUNITIES,
        nearFloorException: readinessContract.NEAR_FLOOR_EXCEPTION,
        requiredHands: readinessContract.REQUIRED_HANDS,
        comparedCohorts: readinessContract.COHORT_KEYS,
      },
      ignoredNonAdditiveColumns: ["players", "months"],
    })}\n`);
    const outputPath = resolve(fixtureDir, `${label}-field.js`);
    if (!weak) {
      const unsupportedActionPath = resolve(fixtureDir, "unsupported-action-cube.csv");
      writeFileSync(unsupportedActionPath, cubeSource.replace(",AA,50,50,0,0,0,0,10,", ",AA,50,49,0,0,0,1,10,"));
      assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/build-field-data.mjs"), unsupportedActionPath, "--output", outputPath], { stdio: "pipe" }), /Every opportunity must have one supported action/);
    }
    execFileSync(process.execPath, [resolve(assetRoot, "tools/build-field-data.mjs"), cubePath, "--output", outputPath, "--source-manifest", manifestPath], { stdio: "ignore" });
    const generated = evaluate(readFileSync(outputPath, "utf8"), "PokerPreflopBenchmarkData");
    assert.equal(generated.schemaVersion, 3);
    assert.equal(generated.source.availability, "unverified", "a provenance-bound but incomplete selector matrix must not become ready");
    assert(generated.source.publicationBlockers.some((reason) => reason.includes("required teaching anchor") || reason.includes("no complete common charts")));
    assert.equal(generated.trainers.vs_raise_free.slices.length, expectedSlices);
    if (!weak) {
      const [slice] = generated.trainers.vs_raise_free.slices;
      assert.deepEqual(Object.keys(slice).sort(), ["cohort", "handActionCounts", "hero_position", "open_size", "opener_position", "stack_bucket"]);
      assert.equal(slice.handActionCounts.length, 169 * 4);
      assert.equal(slice.cells, undefined, "published payload must not duplicate derived cells");
      assert.equal(slice.rates, undefined, "published payload must not duplicate derived rates");
      const materialized = readinessContract.materializeFieldSlice(slice);
      assert.equal(Object.keys(materialized.cells).length, 169);
      assert.deepEqual({ ...materialized.cells.AA }, { fold: 100, call: 0, raise: 0, jam: 0 });
      assert.deepEqual({ ...materialized.rates }, { fold: 100, call: 0, raise: 0, jam: 0 });
      assert.strictEqual(readinessContract.materializeFieldSlice(slice), materialized, "derived view is cached per compact slice");
      assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/build-field-data.mjs"), cubePath, "--output", outputPath, "--source-manifest", manifestPath, "--vs-raise-free", cubePath], { stdio: "pipe" }), /provenance-ready build cannot use legacy override CSVs/);
    }
  }

  const normalizedSbPath = resolve(fixtureDir, "normalized-sb-cube.csv");
  const normalizedSbOutput = resolve(fixtureDir, "normalized-sb-field.js");
  writeFileSync(normalizedSbPath, `${actionHeader}\n${["league1", "leagues2_3", "r15_18"].flatMap((cohort) => hands.flatMap((hand) => [
    ["sb_unopened", cohort, "SB", "—", "2x", "10-12", hand, 25, 25, 0, 0, 0, 0, 10, 1, "2023-09-01 00:00:00", "2026-07-21 23:59:59"].join(","),
    ["sb_unopened", cohort, "SB", "—", "other", "10-12", hand, 25, 25, 0, 0, 0, 0, 10, 1, "2023-09-01 00:00:00", "2026-07-21 23:59:59"].join(","),
  ])).join("\n")}\n`);
  execFileSync(process.execPath, [resolve(assetRoot, "tools/build-field-data.mjs"), normalizedSbPath, "--output", normalizedSbOutput], { stdio: "ignore" });
  const normalizedSb = evaluate(readFileSync(normalizedSbOutput, "utf8"), "PokerPreflopBenchmarkData");
  assert.equal(normalizedSb.trainers.sb_unopened.slices.length, 3, "raw SB size buckets collapse into one exact learner spot per cohort");
  const normalizedSbLeague1 = normalizedSb.trainers.sb_unopened.slices.find((slice) => slice.cohort === "league1");
  assert.deepEqual(
    { ...readinessContract.materializeFieldSlice(normalizedSbLeague1).cells.AA },
    { fold: 100, call: 0, raise: 0, jam: 0 },
    "collapsed SB rows add their raw action counts instead of dropping a size bucket",
  );

  for (const [label, rows] of [
    ["mapped-first", [
      "vs_raise_free,league1,MP,MP,2x,30,AA,25,25,0,0,0,0,10,1,2023-09-01 00:00:00,2026-07-21 23:59:59",
      "vs_raise_free,league1,MP,EP,2x,30,AA,25,25,0,0,0,0,10,1,2023-09-01 00:00:00,2026-07-21 23:59:59",
    ]],
    ["mapped-second", [
      "vs_raise_free,league1,MP,EP,2x,30,AA,25,25,0,0,0,0,10,1,2023-09-01 00:00:00,2026-07-21 23:59:59",
      "vs_raise_free,league1,MP,MP,2x,30,AA,25,25,0,0,0,0,10,1,2023-09-01 00:00:00,2026-07-21 23:59:59",
    ]],
  ]) {
    const path = resolve(fixtureDir, `${label}-mp-collapse.csv`);
    writeFileSync(path, `${actionHeader}\n${rows.join("\n")}\n`);
    execFileSync(process.execPath, [resolve(assetRoot, "tools/build-field-data.mjs"), path, "--output", resolve(fixtureDir, `${label}-mp-collapse.js`)], { stdio: "ignore" });
  }

  const duplicateRawPath = resolve(fixtureDir, "duplicate-raw-cube.csv");
  const duplicateRawRow = "vs_raise_free,league1,BTN,HJ,2x,30,AA,50,50,0,0,0,0,10,1,2023-09-01 00:00:00,2026-07-21 23:59:59";
  writeFileSync(duplicateRawPath, `${actionHeader}\n${duplicateRawRow}\n${duplicateRawRow}\n`);
  assert.throws(
    () => execFileSync(process.execPath, [resolve(assetRoot, "tools/build-field-data.mjs"), duplicateRawPath, "--output", resolve(fixtureDir, "duplicate-raw-field.js")], { stdio: "pipe" }),
    /Duplicate raw source row/,
    "normalization exceptions must not weaken the exact raw-row duplicate guard",
  );

  const evPublishPath = resolve(fixtureDir, "ev-publish.csv");
  const evPublishSource = [
    "cohort,hand_class,opportunities,players,spot_ev_bb_100,ev_sum_bb,folds,calls,raises,jams,fold_pct,call_pct,raise_pct,jam_pct",
    "league1,__SPOT__,50,20,20.00,10,20,10,10,10,40.0,20.0,20.0,20.0",
    "r15_18,__SPOT__,50,25,-10.00,-5,25,10,10,5,50.0,20.0,20.0,10.0",
    "",
  ].join("\n");
  writeFileSync(evPublishPath, evPublishSource);
  const evManifestPath = resolve(fixtureDir, "ev-source-manifest.json");
  const evQ0 = sha256("ev-query-0"), evQ1 = sha256("ev-query-1");
  writeFileSync(evManifestPath, `${JSON.stringify({
    schema: "ff-preflop-benchmark-spot-ev-source-v1",
    analysisWindow: { startInclusive: "2023-09-01T00:00:00Z", endExclusive: "2026-07-22T00:00:00Z" },
    rankBridge: {
      queryJobId: "mcp_bq_job_0123456789abcdef",
      executionMode: "async",
      sha256: sha256("rank"),
      rows: 2,
      usableRows: 2,
      byteSize: 4,
      truncated: false,
      queryTemplate: { file: "tools/msp-preflop-rank-bridge.sql", sha256: rankTemplateHash },
    },
    queryTemplate: { file: "tools/msp-sb-vs-btn-ev.sql", sha256: sha256(evSql) },
    partitionAxis: "time",
    shards: [
      { shardIndex: 0, shardCount: 2, queryJobId: `sync:${evQ0}`, executionMode: "sync", querySha256: evQ0, resultSha256: sha256("ev-result-0"), rowCount: 2, byteSize: 10, truncated: false, durationMs: 10, windowStartInclusive: "2023-09-01T00:00:00Z", windowEndExclusive: "2025-01-01T00:00:00Z" },
      { shardIndex: 1, shardCount: 2, queryJobId: `sync:${evQ1}`, executionMode: "sync", querySha256: evQ1, resultSha256: sha256("ev-result-1"), rowCount: 2, byteSize: 10, truncated: false, durationMs: 10, windowStartInclusive: "2025-01-01T00:00:00Z", windowEndExclusive: "2026-07-22T00:00:00Z" },
    ],
    playerCardinality: { method: "exact_union_private_user_ids", privateIdentifiersDiscarded: true },
    merged: { sha256: sha256(evPublishSource), rows: 2, opportunities: 100 },
  })}\n`);
  const evOutputPath = resolve(fixtureDir, "ev-ready.js");
  execFileSync(process.execPath, [resolve(assetRoot, "tools/build-spot-ev-data.mjs"), evPublishPath, "--output", evOutputPath, "--source-manifest", evManifestPath], { stdio: "ignore" });
  const generatedEv = evaluate(readFileSync(evOutputPath, "utf8"), "PokerPreflopBenchmarkEvData");
  assert.equal(generatedEv.schemaVersion, 3);
  assert.equal(generatedEv.source.availability, "ready");
  assert.equal(generatedEv.source.payloadSha256, readinessContract.evPayloadSha256(generatedEv));
  assert.equal(generatedEv.spots["SB|BTN|2x|18-25"].gapBb100, 30);

  // Runtime, page generation, and the release command all consume this same
  // strict contract. A complete synthetic matrix proves that the ready state
  // is reachable; each mutation below proves that a formerly shallow check
  // cannot accidentally reopen charts or practice.
  const completeHandActionCounts = hands.flatMap(() => [50, 0, 0, 0]);
  const allowedNearFloorSlice = {
    cohort: "league1",
    hero_position: "SB",
    opener_position: "—",
    open_size: "—",
    stack_bucket: "<6",
    handActionCounts: completeHandActionCounts.slice(),
  };
  [0, 4, 8, 12].forEach((offset, index) => {
    allowedNearFloorSlice.handActionCounts[offset] = index === 3 ? 48 : 49;
  });
  assert.equal(readinessContract.isCompleteFieldSlice(allowedNearFloorSlice), true,
    "the source-bound four-hand N=48–49 exception keeps the exact <6 BB chart publishable");
  const excessiveNearFloorSlice = { ...allowedNearFloorSlice, handActionCounts: allowedNearFloorSlice.handActionCounts.slice() };
  excessiveNearFloorSlice.handActionCounts[16] = 49;
  assert.equal(readinessContract.isCompleteFieldSlice(excessiveNearFloorSlice), false,
    "a fifth hand below the standard floor blocks the <6 BB chart");
  const wrongSpotNearFloorSlice = { ...allowedNearFloorSlice, stack_bucket: "6-8" };
  assert.equal(readinessContract.isCompleteFieldSlice(wrongSpotNearFloorSlice), false,
    "the near-floor exception cannot leak into an adjacent stack bucket");
  const completeTrainers = Object.fromEntries(Object.entries(readinessContract.REQUIRED_SPOT_MATRIX).map(([trainer, spots]) => [
    trainer,
    {
      slices: spots.flatMap((spot) => {
        const [hero_position, opener_position, open_size, stack_bucket] = spot.split("|");
        return readinessContract.COHORT_KEYS.map((cohort) => ({
          cohort,
          hero_position,
          opener_position,
          open_size,
          stack_bucket,
          handActionCounts: completeHandActionCounts,
        }));
      }),
    },
  ]));
  const completePublishedSpotMatrix = Object.fromEntries(Object.entries(readinessContract.REQUIRED_SPOT_MATRIX)
    .map(([trainer, spots]) => [trainer, [...spots].sort()]));
  const completePublishedRows = Object.values(readinessContract.REQUIRED_SPOT_MATRIX)
    .reduce((sum, spots) => sum + spots.length, 0) * readinessContract.COHORT_KEYS.length * readinessContract.REQUIRED_HANDS;
  const completePublishedOpportunities = completePublishedRows * readinessContract.MIN_HAND_OPPORTUNITIES;
  const completeField = {
    schemaVersion: 3,
    source: {
      system: "MSP",
      availability: "ready",
      analysisWindow: { ...readinessContract.ANALYSIS_WINDOW },
      rankSemantics: "rank_at_hand",
      cohorts: { league1: [1, 5], leagues2_3: [6, 14], r15_18: [15, 18] },
      handMinimum: readinessContract.MIN_HAND_OPPORTUNITIES,
      nearFloorException: readinessContract.NEAR_FLOOR_EXCEPTION,
      requiredHandsPerChart: readinessContract.REQUIRED_HANDS,
      selectorUniverse: readinessContract.REQUIRED_SPOT_MATRIX,
      requiredSpotAnchors: readinessContract.REQUIRED_PUBLICATION_ANCHORS,
      publicationPolicy: readinessContract.PUBLICATION_POLICY,
      selectorMode: readinessContract.SELECTOR_MODE,
      publishedSpotMatrix: completePublishedSpotMatrix,
      publishedRows: completePublishedRows,
      publishedOpportunities: completePublishedOpportunities,
      sliceMinimum: 100,
      provenance: JSON.parse(readFileSync(resolve(fixtureDir, "exact-manifest.json"), "utf8")),
    },
    trainers: completeTrainers,
  };
  const refreshFieldDigest = () => {
    completeField.source.payloadSha256 = readinessContract.fieldPayloadSha256(completeField);
  };
  const refreshEvDigest = () => {
    generatedEv.source.payloadSha256 = readinessContract.evPayloadSha256(generatedEv);
  };
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "unrelated small-source provenance cannot bless a full matrix");
  completeField.source.provenance.merged.rows = completePublishedRows;
  completeField.source.provenance.merged.opportunities = completePublishedOpportunities;
  completeField.source.provenance.shards.forEach((shard) => { shard.rowCount = completePublishedRows; });
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, true, "the exact full matrix reaches ready");
  assert.equal(validateCurrentBenchmarkTemplates(root, completeField, generatedEv).ready, true, "ready payload provenance matches the current SQL bytes");
  assert(Buffer.byteLength(JSON.stringify(completeField)) < 4_000_000, "full exact matrix stays below the compact 4 MB payload ceiling");

  const optionalSpot = readinessContract.REQUIRED_SPOT_MATRIX.vs_raise_free.find((spot) => !readinessContract.REQUIRED_PUBLICATION_ANCHORS.vs_raise_free.includes(spot));
  const optionalSlices = completeField.trainers.vs_raise_free.slices.filter((slice) => readinessContract.sliceSpotKey(slice) === optionalSpot);
  completeField.trainers.vs_raise_free.slices = completeField.trainers.vs_raise_free.slices.filter((slice) => readinessContract.sliceSpotKey(slice) !== optionalSpot);
  completeField.source.publishedSpotMatrix.vs_raise_free = completeField.source.publishedSpotMatrix.vs_raise_free.filter((spot) => spot !== optionalSpot);
  completeField.source.publishedRows -= readinessContract.COHORT_KEYS.length * readinessContract.REQUIRED_HANDS;
  completeField.source.publishedOpportunities -= readinessContract.COHORT_KEYS.length * readinessContract.REQUIRED_HANDS * readinessContract.MIN_HAND_OPPORTUNITIES;
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, true, "a sparse optional tuple may be omitted from the contextual catalog without creating a disabled control");
  completeField.trainers.vs_raise_free.slices.push(...optionalSlices);
  completeField.source.publishedSpotMatrix.vs_raise_free.push(optionalSpot);
  completeField.source.publishedSpotMatrix.vs_raise_free.sort();
  completeField.source.publishedRows = completePublishedRows;
  completeField.source.publishedOpportunities = completePublishedOpportunities;
  refreshFieldDigest();

  const currentActionTemplateHash = completeField.source.provenance.queryTemplate.sha256;
  completeField.source.provenance.queryTemplate.sha256 = sha256("stale-action-template");
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, true, "browser-safe structure alone cannot know current repository bytes");
  assert.equal(validateCurrentBenchmarkTemplates(root, completeField, generatedEv).ready, false, "page/release gate blocks stale query-template provenance");
  completeField.source.provenance.queryTemplate.sha256 = currentActionTemplateHash;
  refreshFieldDigest();

  const firstSlice = completeField.trainers.vs_raise_free.slices[0];
  firstSlice.handActionCounts = completeHandActionCounts.slice(0, -4);
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "168/169 is blocked");
  firstSlice.handActionCounts = completeHandActionCounts;
  refreshFieldDigest();

  const weakHandActionCounts = completeHandActionCounts.slice();
  weakHandActionCounts[weakHandActionCounts.length - 4] = 49;
  firstSlice.handActionCounts = weakHandActionCounts;
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "N=49 is blocked");
  firstSlice.handActionCounts = completeHandActionCounts;
  refreshFieldDigest();

  const invalidHandActionCounts = completeHandActionCounts.slice();
  invalidHandActionCounts[0] = -1;
  firstSlice.handActionCounts = invalidHandActionCounts;
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "negative source counts are blocked");
  firstSlice.handActionCounts = completeHandActionCounts;
  refreshFieldDigest();

  const missingCohort = completeField.trainers.vs_raise_free.slices.pop();
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "a missing cohort slice is blocked");
  completeField.trainers.vs_raise_free.slices.push(missingCohort);
  refreshFieldDigest();

  completeField.source.analysisWindow.startInclusive = "2023-10-01T00:00:00Z";
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "a shortened field window is blocked");
  completeField.source.analysisWindow.startInclusive = readinessContract.ANALYSIS_WINDOW.startInclusive;
  refreshFieldDigest();

  const originalResultHash = completeField.source.provenance.shards[0].resultSha256;
  completeField.source.provenance.shards[0].resultSha256 = "not-a-source-hash";
  refreshFieldDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "invalid provenance is blocked");
  completeField.source.provenance.shards[0].resultSha256 = originalResultHash;
  refreshFieldDigest();

  completeField.source.unboundMutation = "tampered after build";
  const tamperedDigestResult = readinessContract.validateFieldData(completeField);
  assert.equal(tamperedDigestResult.ready, false, "post-build payload mutation is blocked");
  assert(tamperedDigestResult.reasons.includes("field: payload digest differs"));
  delete completeField.source.unboundMutation;
  refreshFieldDigest();

  const materializedFirstSlice = readinessContract.materializeFieldSlice(firstSlice);
  assert.deepEqual({ ...materializedFirstSlice.rates }, { fold: 100, call: 0, raise: 0, jam: 0 });
  assert.deepEqual({ ...materializedFirstSlice.cells["32o"] }, { fold: 100, call: 0, raise: 0, jam: 0 });
  assert.equal(materializedFirstSlice.minimumCellOpportunities, 50);
  assert.equal(materializedFirstSlice.actionCounts.fold, 169 * 50);
  assert.strictEqual(readinessContract.materializeFieldSlice(firstSlice), materializedFirstSlice);

  const originalSyncExecution = completeField.source.provenance.shards[0].queryJobId;
  completeField.source.provenance.shards[0].queryJobId = `sync:${sha256("different-query")}`;
  refreshFieldDigest();
  assert.equal(readinessContract.validateFieldData(completeField).ready, false, "sync execution identity must match the query digest");
  completeField.source.provenance.shards[0].queryJobId = originalSyncExecution;
  refreshFieldDigest();

  const originalExecutionMode = completeField.source.provenance.shards[0].executionMode;
  delete completeField.source.provenance.shards[0].executionMode;
  refreshFieldDigest();
  assert.equal(readinessContract.validateFieldData(completeField).ready, false, "provenance cannot infer execution mode from a job id prefix");
  completeField.source.provenance.shards[0].executionMode = originalExecutionMode;
  refreshFieldDigest();

  const originalShardRows = completeField.source.provenance.shards.map((shard) => shard.rowCount);
  completeField.source.provenance.shards.forEach((shard) => { shard.rowCount = 1; });
  refreshFieldDigest();
  assert.equal(readinessContract.validateFieldData(completeField).ready, false, "merged rows cannot exceed source shard rows");
  completeField.source.provenance.shards.forEach((shard, index) => { shard.rowCount = originalShardRows[index]; });
  refreshFieldDigest();

  const originalRankHash = generatedEv.source.provenance.rankBridge.sha256;
  generatedEv.source.provenance.rankBridge.sha256 = sha256("different-rank-bridge");
  refreshEvDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, false, "field and EV must use the same rank bridge");
  generatedEv.source.provenance.rankBridge.sha256 = originalRankHash;
  refreshEvDigest();
  assert.equal(readinessContract.validateBenchmarkData(completeField, generatedEv).ready, true, "restored complete payload remains ready");

  const weakEvSource = evPublishSource.replace("league1,__SPOT__,50,20,20.00,10,20,10,10,10,40.0", "league1,__SPOT__,49,20,20.00,9.8,19,10,10,10,38.8");
  const weakEvPath = resolve(fixtureDir, "ev-weak.csv");
  writeFileSync(weakEvPath, weakEvSource);
  const weakEvManifest = JSON.parse(readFileSync(evManifestPath, "utf8"));
  weakEvManifest.merged.sha256 = sha256(weakEvSource);
  weakEvManifest.merged.opportunities = 99;
  const weakEvManifestPath = resolve(fixtureDir, "ev-weak-source-manifest.json");
  writeFileSync(weakEvManifestPath, `${JSON.stringify(weakEvManifest)}\n`);
  assert.throws(() => execFileSync(process.execPath, [resolve(assetRoot, "tools/build-spot-ev-data.mjs"), weakEvPath, "--output", resolve(fixtureDir, "ev-weak.js"), "--source-manifest", weakEvManifestPath], { stdio: "pipe" }), /observed outcome stays unavailable below N=50/);

  // Manifest assembly recomputes hashes from the exact query/result bytes and
  // refuses to treat non-source attempts as source shards.
  const rankMetadataPath = resolve(fixtureDir, "rank-metadata.json");
  const rankSourceBytes = readFileSync(rankPath);
  writeFileSync(rankMetadataPath, `${JSON.stringify({
    file: rankPath,
    queryJobId: "mcp_bq_job_0123456789abcdef",
    executionMode: "async",
    rows: 3,
    usableRows: 2,
    byteSize: rankSourceBytes.byteLength,
    truncated: false,
    sha256: sha256(rankSourceBytes),
    queryTemplate: { file: "tools/msp-preflop-rank-bridge.sql", sha256: rankTemplateHash },
  })}\n`);
  const queryA = resolve(fixtureDir, "query-a.sql"), queryB = resolve(fixtureDir, "query-b.sql");
  writeFileSync(queryA, "SELECT 1\n"); writeFileSync(queryB, "SELECT 2\n");
  const ledgerPath = resolve(fixtureDir, "action-ledger.json");
  const actionInputs = [actionA, actionB];
  const queryInputs = [queryA, queryB];
  writeFileSync(ledgerPath, `${JSON.stringify({
    partitionAxis: "time",
    shards: actionInputs.map((resultPath, index) => {
      const querySha = sha256(readFileSync(queryInputs[index]));
      const result = readFileSync(resultPath);
      return { shardIndex: index, shardCount: 2, queryPath: queryInputs[index], resultPath, queryJobId: `sync:${querySha}`, executionMode: "sync", rowCount: 1, byteSize: result.byteLength, truncated: false, durationMs: 10, windowStartInclusive: index === 0 ? "2023-09-01T00:00:00Z" : "2025-01-01T00:00:00Z", windowEndExclusive: index === 0 ? "2025-01-01T00:00:00Z" : "2026-07-22T00:00:00Z" };
    }),
    nonSourceAttempts: [{ id: "queued-control", reason: "not used" }],
  })}\n`);
  const assembledManifestPath = resolve(fixtureDir, "assembled-action-manifest.json");
  execFileSync(process.execPath, [
    resolve(assetRoot, "tools/build-source-manifest.mjs"),
    "--kind=action",
    `--rank-bridge-metadata=${rankMetadataPath}`,
    `--shard-ledger=${ledgerPath}`,
    `--merged-csv=${actionMerged}`,
    `--merge-metadata=${actionMergeMetadata}`,
    `--output=${assembledManifestPath}`,
  ], { stdio: "ignore" });
  const assembled = JSON.parse(readFileSync(assembledManifestPath, "utf8"));
  assert.equal(assembled.schema, "ff-preflop-benchmark-action-cube-source-v1");
  assert.equal(assembled.shards.length, 2);
  assert.equal(assembled.nonSourceAttempts[0].id, "queued-control");
  assert(!JSON.stringify(assembled.shards).includes("queued-control"));

  const evLedgerPath = resolve(fixtureDir, "ev-ledger.json");
  const evInputs = [evA, evB];
  writeFileSync(evLedgerPath, `${JSON.stringify({
    partitionAxis: "time",
    shards: evInputs.map((resultPath, index) => {
      const querySha = sha256(readFileSync(queryInputs[index]));
      const result = readFileSync(resultPath);
      return { shardIndex: index, shardCount: 2, queryPath: queryInputs[index], resultPath, queryJobId: `sync:${querySha}`, executionMode: "sync", rowCount: 1, byteSize: result.byteLength, truncated: false, durationMs: 10, windowStartInclusive: index === 0 ? "2023-09-01T00:00:00Z" : "2025-01-01T00:00:00Z", windowEndExclusive: index === 0 ? "2025-01-01T00:00:00Z" : "2026-07-22T00:00:00Z" };
    }),
  })}\n`);
  const assembledEvManifestPath = resolve(fixtureDir, "assembled-ev-manifest.json");
  execFileSync(process.execPath, [
    resolve(assetRoot, "tools/build-source-manifest.mjs"),
    "--kind=ev",
    `--rank-bridge-metadata=${rankMetadataPath}`,
    `--shard-ledger=${evLedgerPath}`,
    `--merged-csv=${evMerged}`,
    `--merge-metadata=${evMergeMetadata}`,
    `--output=${assembledEvManifestPath}`,
  ], { stdio: "ignore" });
  const assembledEv = JSON.parse(readFileSync(assembledEvManifestPath, "utf8"));
  assert.equal(assembledEv.schema, "ff-preflop-benchmark-spot-ev-source-v1");
  assert.deepEqual(assembledEv.playerCardinality, { method: "exact_union_private_user_ids", privateIdentifiersDiscarded: true });
  assert(!JSON.stringify(assembledEv).includes("private_player_ids"));
  assert(!JSON.stringify(assembledEv).includes("101") && !JSON.stringify(assembledEv).includes("102") && !JSON.stringify(assembledEv).includes("103"));

  const methodologyDir = resolve(fixtureDir, "methodology");
  execFileSync(process.execPath, [resolve(assetRoot, "tools/build-methodology-only-data.mjs"), methodologyDir], { stdio: "ignore" });
  const generatedMethodologyField = evaluate(readFileSync(resolve(methodologyDir, "field-data.js"), "utf8"), "PokerPreflopBenchmarkData");
  const generatedMethodologyEv = evaluate(readFileSync(resolve(methodologyDir, "spot-ev-data.js"), "utf8"), "PokerPreflopBenchmarkEvData");
  assert.equal(generatedMethodologyField.source.availability, "methodology_only");
  assert(Object.values(generatedMethodologyField.trainers).every((trainer) => trainer.slices.length === 0));
  assert.equal(generatedMethodologyEv.source.availability, "methodology_only");
  assert.deepEqual(Object.keys(generatedMethodologyEv.spots), []);
  if (checkedInMethodology) {
    assert.equal(readFileSync(resolve(methodologyDir, "field-data.js"), "utf8"), readFileSync(resolve(assetRoot, "field-data.js"), "utf8"));
    assert.equal(readFileSync(resolve(methodologyDir, "spot-ev-data.js"), "utf8"), readFileSync(resolve(assetRoot, "spot-ev-data.js"), "utf8"));
  }
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

console.log("preflop benchmark source gate contract ok");
