#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const options = {};
const positional = [];
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) options[match[1]] = match[2];
  else positional.push(arg);
}
if (positional.length !== 1) {
  throw new Error("Usage: node inject-full-history-field-data.mjs artifact.json [--cbet-data=...] [--checkraise-data=...]");
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const artifactPath = path.resolve(positional[0]);
const cbetPath = path.resolve(options["cbet-data"] || path.join(repo, "assets/poker-flop-cbet-hu-lesson/data.js"));
const checkraisePath = path.resolve(options["checkraise-data"] || path.join(repo, "assets/poker-flop-checkraise-lesson/data.js"));
const cbetHtmlPath = path.resolve(options["cbet-html"] || path.join(repo, "flop-cbet-hu-lesson.html"));
const checkraiseHtmlPath = path.resolve(options["checkraise-html"] || path.join(repo, "flop-checkraise-lesson.html"));
const artifactBytes = fs.readFileSync(artifactPath);
const artifact = JSON.parse(artifactBytes.toString("utf8"));
const postflopQueryTemplateSha256 = createHash("sha256")
  .update(fs.readFileSync(path.join(repo, "assets/poker-flop-cbet-hu-lesson/research/full-history-postflop-field-cube.sql")))
  .digest("hex");
const rankQueryTemplateSha256 = createHash("sha256")
  .update(fs.readFileSync(path.join(repo, "assets/poker-flop-cbet-hu-lesson/research/full-history-rank-intervals.sql")))
  .digest("hex");

const cohortKeys = ["league1", "league2", "league3", "novice"];
const allowedNodes = new Set(["cbet", "bb_response"]);
const allowedDepths = new Set(["<20", "20-30", "30-40", "40-70", "70+"]);
const allowedPositions = {
  cbet: new Set(["BTN", "CO", "HJ", "MP", "EP"]),
  bb_response: new Set(["BTN", "CO"])
};
const rows = Array.isArray(artifact.rows) ? artifact.rows : [];
const errors = [];
if (artifact.schemaVersion !== 1) errors.push("artifact.schemaVersion must be 1");
if (artifact.source?.table !== "analytics.int_tracker_hand_joined") errors.push("artifact source table is invalid");
if (artifact.source?.window?.startInclusive !== "2023-09-01" || artifact.source?.window?.endExclusive !== "2026-07-22") {
  errors.push("artifact window must be [2023-09-01, 2026-07-22)");
}
if (artifact.source?.latest?.key !== "hand_player_id") errors.push("latest key must be hand_player_id");
if (artifact.source?.rankBridge !== "exact_rank_at_hand_half_open") errors.push("rank bridge must be exact half-open rank-at-hand");
if (artifact.source?.minimumDenominator !== 50) errors.push("minimum denominator must be 50");
if (
  artifact.source?.shardManifest?.strategy !== "six_month_time_windows_x_contiguous_user_partitions"
  || artifact.source?.shardManifest?.continuous !== true
  || artifact.source?.shardManifest?.userPartitionPolicy !== "sorted_user_offsets_exact_once"
  || !Array.isArray(artifact.source?.shardManifest?.windowPartitions)
  || !artifact.source.shardManifest.windowPartitions.length
  || !/^[a-f0-9]{64}$/.test(String(artifact.source?.shardManifest?.sha256 || ""))
) {
  errors.push("artifact must carry the validated continuous shard manifest");
}
const shardManifest = artifact.source?.shardManifest;
if (shardManifest?.sourceQueryTemplateSha256 !== postflopQueryTemplateSha256) {
  errors.push("postflop source query-template SHA is stale");
}
const rankSource = shardManifest?.rankSource;
if (
  !rankSource
  || rankSource.sourceQueryTemplateSha256 !== rankQueryTemplateSha256
  || rankSource.querySha256 !== rankQueryTemplateSha256
  || !["async", "sync"].includes(rankSource.executionMode)
  || !rankSource.queryJobId
  || !/^[a-f0-9]{64}$/.test(String(rankSource.resultSha256 || ""))
  || !Number.isSafeInteger(rankSource.rowCount)
  || rankSource.rowCount <= 0
  || rankSource.window?.startInclusive !== "2023-09-01"
  || rankSource.window?.endExclusive !== "2026-07-22"
) {
  errors.push("rank-source provenance is incomplete or stale");
} else if (rankSource.executionMode === "sync" && rankSource.queryJobId !== `sync:${rankSource.querySha256}`) {
  errors.push("rank-source sync execution identity is invalid");
}
const executions = Array.isArray(shardManifest?.executions) ? shardManifest.executions : [];
if (!Number.isSafeInteger(shardManifest?.shardCount) || shardManifest.shardCount <= 0 || executions.length !== shardManifest.shardCount) {
  errors.push("shard execution provenance is incomplete");
}
const executionResultHashes = new Set();
executions.forEach((execution, index) => {
  if (
    !execution?.id
    || !["async", "sync"].includes(execution.executionMode)
    || !execution.queryJobId
    || !/^[a-f0-9]{64}$/.test(String(execution.querySha256 || ""))
    || !/^[a-f0-9]{64}$/.test(String(execution.resultSha256 || ""))
    || !Number.isSafeInteger(execution.rowCount)
    || execution.rowCount <= 0
    || !execution.window?.startInclusive
    || !execution.window?.endExclusive
    || execution.window.startInclusive >= execution.window.endExclusive
  ) {
    errors.push(`shard execution ${index} is invalid`);
  } else if (execution.executionMode === "sync" && execution.queryJobId !== `sync:${execution.querySha256}`) {
    errors.push(`shard execution ${index} has an invalid sync identity`);
  }
  if (executionResultHashes.has(execution?.resultSha256)) errors.push(`shard execution ${index} repeats a result hash`);
  executionResultHashes.add(execution?.resultSha256);
});
if (JSON.stringify(artifact.source?.cohortBands) !== JSON.stringify({ league1: [1, 5], league2: [6, 10], league3: [11, 14], novice: [15, 18] })) {
  errors.push("cohort bands must be four disjoint canonical bands");
}
const inputFiles = Array.isArray(artifact.source?.inputFiles) ? artifact.source.inputFiles : [];
if (!inputFiles.length) errors.push("artifact must include source shard hashes");
const inputHashes = new Set();
inputFiles.forEach((file, index) => {
  if (!file?.name || !/^[a-f0-9]{64}$/.test(String(file?.sha256 || ""))) errors.push(`inputFiles[${index}] is invalid`);
  if (inputHashes.has(file?.sha256)) errors.push(`inputFiles[${index}] repeats a shard hash`);
  inputHashes.add(file?.sha256);
});
if (inputFiles.length !== executions.length || inputFiles.some((file) => !executionResultHashes.has(file.sha256))) {
  errors.push("source shard hashes do not match execution provenance");
}
if (!rows.length) errors.push("artifact rows are empty");

const rowKeys = new Set();
rows.forEach((row, index) => {
  if (!allowedNodes.has(row.node)) errors.push(`rows[${index}]: unexpected node`);
  if (!cohortKeys.includes(row.cohort)) errors.push(`rows[${index}]: unexpected cohort`);
  if (!allowedDepths.has(row.depthBand)) errors.push(`rows[${index}]: unexpected depth`);
  if (!allowedPositions[row.node]?.has(row.position)) errors.push(`rows[${index}]: unexpected position`);
  const rowKey = [row.node, row.cohort, row.position, row.depthBand].join("|");
  if (rowKeys.has(rowKey)) errors.push(`rows[${index}]: duplicate aggregate row`);
  rowKeys.add(rowKey);
  const opportunities = Number(row.opportunities);
  const integers = row.node === "cbet"
    ? [opportunities, Number(row.checksBack), Number(row.cbets)]
    : [opportunities, Number(row.folds), Number(row.calls), Number(row.raises), Number(row.other)];
  if (integers.some((value) => !Number.isSafeInteger(value) || value < 0)) errors.push(`rows[${index}]: invalid counts`);
  if (row.node === "cbet" && Number(row.checksBack) + Number(row.cbets) !== opportunities) {
    errors.push(`rows[${index}]: c-bet actions do not sum`);
  }
  if (row.node === "cbet" && (Number(row.facedRaises) > Number(row.cbets) || Number(row.folds) || Number(row.calls) || Number(row.raises) || Number(row.other))) {
    errors.push(`rows[${index}]: c-bet row has impossible response counts`);
  }
  if (row.node === "bb_response" && Number(row.folds) + Number(row.calls) + Number(row.raises) + Number(row.other) !== opportunities) {
    errors.push(`rows[${index}]: BB actions do not sum`);
  }
  if (row.node === "bb_response" && (Number(row.checksBack) || Number(row.cbets) || Number(row.facedRaises))) {
    errors.push(`rows[${index}]: BB-response row has impossible c-bet counts`);
  }
  if (row.node === "bb_response" && Number(row.other) !== 0) errors.push(`rows[${index}]: BB-response row has unclassified actions`);
  if (!row.firstHandAt || !row.lastHandAt || row.firstHandAt > row.lastHandAt) errors.push(`rows[${index}]: invalid hand-time bounds`);
  if (row.publishable !== (opportunities >= 50)) errors.push(`rows[${index}]: N=50 flag mismatch`);
});
for (const cohort of cohortKeys) {
  for (const node of allowedNodes) {
    if (!rows.some((row) => row.cohort === cohort && row.node === node)) errors.push(`missing ${node}/${cohort}`);
  }
}
if (errors.length) throw new Error(errors.join("\n"));

const artifactSha256 = createHash("sha256").update(artifactBytes).digest("hex");
const fullHistory = {
  schemaVersion: 1,
  meta: {
    source: "analytics.int_tracker_hand_joined",
    sourceLabel: "FF ClickHouse · exact latest-first field cube",
    periodLabel: "01.09.2023–22.07.2026",
    windowStartInclusive: "2023-09-01",
    windowEndExclusive: "2026-07-22",
    windowSemantics: "half_open_utc",
    rankTiming: "exact_as_of_hand",
    rankBridge: "half_open_intervals",
    latestKey: "hand_player_id",
    latestOrder: artifact.source.latest.order,
    minimumDenominator: 50,
    cohortBands: artifact.source.cohortBands,
    shardManifest: artifact.source.shardManifest,
    artifactSha256
  },
  totals: artifact.totals,
  rows
};

const startMarker = "/* FF_FULL_HISTORY_FIELD_START */";
const endMarker = "/* FF_FULL_HISTORY_FIELD_END */";
const serializedFullHistory = JSON.stringify(fullHistory, null, 2);

function replaceMarkedValue(source, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) throw new Error(`${label} full-history markers are missing or invalid`);
  const replacement = `${startMarker} ${serializedFullHistory} ${endMarker}`;
  return `${source.slice(0, start)}${replacement}${source.slice(end + endMarker.length)}`;
}

function injectCbetSource(source) {
  if (!/window\.FF_FLOP_CBET_HU_DATA\s*=/.test(source)) {
    throw new Error("c-bet data assignment is missing");
  }
  let injected;
  if (source.includes(startMarker) || source.includes(endMarker)) {
    injected = replaceMarkedValue(source, "c-bet");
  } else {
    injected = `${source.trimEnd()}\nwindow.FF_FLOP_CBET_HU_DATA.fullHistory = ${startMarker} ${serializedFullHistory} ${endMarker};\n`;
  }
  return injected.replace(/(["']?status["']?\s*:\s*)"methodology_only"/, '$1"ready"');
}

function atomicWrite(target, source) {
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, source);
  fs.renameSync(temporary, target);
}

function updateDataCacheToken(htmlPath, assetPath, dataPath) {
  const token = createHash("sha256").update(fs.readFileSync(dataPath)).digest("hex").slice(0, 12);
  const source = fs.readFileSync(htmlPath, "utf8");
  const escapedAsset = assetPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(src=["']${escapedAsset}\\?v=)[a-f0-9]+(["'])`, "g");
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`${path.basename(htmlPath)} must load ${assetPath} with exactly one hexadecimal cache token`);
  }
  atomicWrite(htmlPath, source.replace(pattern, `$1${token}$2`));
  return token;
}

const cbetSource = injectCbetSource(fs.readFileSync(cbetPath, "utf8"));
const checkraiseSource = fs.readFileSync(checkraisePath, "utf8");
const nextCheckraise = replaceMarkedValue(checkraiseSource, "check-raise");

atomicWrite(cbetPath, cbetSource);
atomicWrite(checkraisePath, nextCheckraise);
const cbetCacheToken = updateDataCacheToken(
  cbetHtmlPath,
  "assets/poker-flop-cbet-hu-lesson/data.js",
  cbetPath
);
const checkraiseCacheToken = updateDataCacheToken(
  checkraiseHtmlPath,
  "assets/poker-flop-checkraise-lesson/data.js",
  checkraisePath
);
process.stdout.write(`${JSON.stringify({
  artifact: path.basename(artifactPath),
  artifactSha256,
  rows: rows.length,
  cbetRows: rows.filter((row) => row.node === "cbet").length,
  bbResponseRows: rows.filter((row) => row.node === "bb_response").length,
  cbetData: path.basename(cbetPath),
  checkraiseData: path.basename(checkraisePath),
  cbetCacheToken,
  checkraiseCacheToken
}, null, 2)}\n`);
