#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const WINDOW_START = "2023-09-01";
const WINDOW_END = "2026-07-22";
const WINDOW_MONTHS = 6;
const USER_SHARD_COUNT = 2;
const RANK_MIN = 1;
const RANK_MAX = 18;

const positional = [];
const options = {};
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) options[match[1]] = match[2];
  else positional.push(arg);
}
if (positional.length !== 1) {
  throw new Error("Usage: node print-full-history-shard-plan.mjs /private/path/rank-intervals.csv [--rank-source-meta=/private/path/rank-intervals.meta.json] [--output-dir=/private/tmp/ff-postflop-full-history-20260722] [--plan-output=/private/tmp/.../shard-plan.json] [--refine-shard=<id> --refine-user-shard-count=4 | --refinement=<id>:4,<replacement-id>:8] [--format=json|commands|windows]");
}

const rankPath = path.resolve(positional[0]);
const rankSourceMetaPath = path.resolve(options["rank-source-meta"] || `${rankPath}.meta.json`);
const outputDir = path.resolve(options["output-dir"] || "/private/tmp/ff-postflop-full-history-20260722");
const planPath = path.resolve(options["plan-output"] || path.join(outputDir, "full-history-shard-plan.json"));
const manifestPath = path.join(outputDir, "full-history-shard-manifest.json");
const artifactPath = path.join(outputDir, "postflop-field-cube.json");
const format = options.format || "json";
if (!["json", "commands", "windows"].includes(format)) throw new Error(`Unsupported format: ${format}`);

function timeWindows(start, end, months) {
  const windows = [];
  let cursor = new Date(`${start}T00:00:00Z`);
  const final = new Date(`${end}T00:00:00Z`);
  while (cursor < final) {
    const from = cursor.toISOString().slice(0, 10);
    const candidate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + months, 1));
    const toDate = candidate < final ? candidate : final;
    const to = toDate.toISOString().slice(0, 10);
    windows.push({ from, to });
    cursor = toDate;
  }
  return windows;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

const windows = timeWindows(WINDOW_START, WINDOW_END, WINDOW_MONTHS);
const renderer = "assets/poker-flop-cbet-hu-lesson/tools/render-full-history-field-query.mjs";
const recorder = "assets/poker-flop-cbet-hu-lesson/tools/record-full-history-source-execution.mjs";
const postflopQueryTemplate = "assets/poker-flop-cbet-hu-lesson/research/full-history-postflop-field-cube.sql";
const rankQueryTemplate = "assets/poker-flop-cbet-hu-lesson/research/full-history-rank-intervals.sql";
function shardDefinition(window, userShardIndex, userShardCount) {
  const id = `${window.from}_${window.to}_u${userShardIndex + 1}of${userShardCount}`;
  const sqlPath = path.join(outputDir, `${id}.sql`);
  const metaPath = path.join(outputDir, `${id}.meta.json`);
  const csvPath = path.join(outputDir, `${id}.csv`);
  const executionPath = path.join(outputDir, `${id}.execution.json`);
  const args = [
    "node", renderer, rankPath,
    `--from=${window.from}`,
    `--to=${window.to}`,
    `--rank-min=${RANK_MIN}`,
    `--rank-max=${RANK_MAX}`,
    `--user-shard-index=${userShardIndex}`,
    `--user-shard-count=${userShardCount}`,
    `--output=${sqlPath}`,
    `--meta-output=${metaPath}`
  ];
  const recordSyncArgs = [
    "node", recorder,
    `--query=${sqlPath}`,
    `--query-template=${postflopQueryTemplate}`,
    `--result=${csvPath}`,
    `--output=${executionPath}`,
    "--execution-mode=sync",
    `--window-start=${window.from}`,
    `--window-end=${window.to}`
  ];
  return {
    id,
    ...window,
    rankMin: RANK_MIN,
    rankMax: RANK_MAX,
    userShardIndex,
    userShardCount,
    sqlPath,
    metaPath,
    csvPath,
    executionPath,
    renderCommand: args.map(shellQuote).join(" "),
    recordSyncCommand: recordSyncArgs.map(shellQuote).join(" ")
  };
}

const shards = windows.flatMap((window) =>
  Array.from({ length: USER_SHARD_COUNT }, (_, userShardIndex) =>
    shardDefinition(window, userShardIndex, USER_SHARD_COUNT)
  )
);
const refinements = [];
const refinementSpecs = options.refinement
  ? String(options.refinement).split(",").filter(Boolean).map((spec) => {
      const separator = spec.lastIndexOf(":");
      if (separator <= 0) throw new Error(`Invalid --refinement spec: ${spec}`);
      return {
        id: spec.slice(0, separator),
        count: Number(spec.slice(separator + 1))
      };
    })
  : String(options["refine-shard"] || "").split(",").filter(Boolean).map((id) => ({
      id,
      count: Number(options["refine-user-shard-count"])
    }));
for (const refinement of refinementSpecs) {
  const refineShardId = refinement.id;
  const targetIndex = shards.findIndex((shard) => shard.id === refineShardId);
  if (targetIndex < 0) throw new Error(`Unknown --refine-shard: ${refineShardId}`);
  const target = shards[targetIndex];
  const refinedCount = refinement.count;
  if (!Number.isSafeInteger(refinedCount) || refinedCount <= target.userShardCount || refinedCount % target.userShardCount !== 0) {
    throw new Error("--refine-user-shard-count must be an integer multiple larger than the original count");
  }
  const factor = refinedCount / target.userShardCount;
  const firstIndex = target.userShardIndex * factor;
  const replacements = Array.from({ length: factor }, (_, offset) =>
    shardDefinition({ from: target.from, to: target.to }, firstIndex + offset, refinedCount)
  );
  shards.splice(targetIndex, 1, ...replacements);
  refinements.push({
    replacedShardId: target.id,
    originalUserShard: { index: target.userShardIndex, count: target.userShardCount },
    replacementUserShards: replacements.map((shard) => ({ id: shard.id, index: shard.userShardIndex, count: shard.userShardCount }))
  });
}

const manifestCommand = [
  "node",
  "assets/poker-flop-cbet-hu-lesson/tools/build-full-history-shard-manifest.mjs",
  planPath,
  `--rank-source-meta=${rankSourceMetaPath}`,
  `--output=${manifestPath}`
].map(shellQuote).join(" ");
const mergeCommand = [
  "node",
  "assets/poker-flop-cbet-hu-lesson/tools/merge-full-history-field-shards.mjs",
  ...shards.map((shard) => shard.csvPath),
  `--manifest=${manifestPath}`,
  `--window-start=${WINDOW_START}`,
  `--window-end=${WINDOW_END}`,
  `--output=${artifactPath}`
].map(shellQuote).join(" ");
const rankRecordSyncCommand = [
  "node", recorder,
  `--query=${rankQueryTemplate}`,
  `--query-template=${rankQueryTemplate}`,
  `--result=${rankPath}`,
  `--output=${rankSourceMetaPath}`,
  "--execution-mode=sync",
  `--window-start=${WINDOW_START}`,
  `--window-end=${WINDOW_END}`
].map(shellQuote).join(" ");

const plan = {
  schemaVersion: 4,
  window: { startInclusive: WINDOW_START, endExclusive: WINDOW_END },
  strategy: "six_month_time_windows_x_contiguous_user_partitions",
  userPartitionPolicy: "sorted_user_offsets_exact_once",
  windowMonths: WINDOW_MONTHS,
  defaultUserShardCount: USER_SHARD_COUNT,
  refinements,
  rankShard: [RANK_MIN, RANK_MAX],
  windows,
  shardCount: shards.length,
  outputDir,
  planPath,
  rankPath,
  rankSourceMetaPath,
  manifestPath,
  artifactPath,
  shards,
  rankRecordSyncCommand,
  manifestCommand,
  mergeCommand
};

if (options["plan-output"]) {
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}

if (format === "windows") {
  process.stdout.write(`${windows.map((window) => `${window.from}\t${window.to}`).join("\n")}\n`);
} else if (format === "commands") {
  process.stdout.write(`${shards.map((shard) => shard.renderCommand).join("\n")}\n${manifestCommand}\n${mergeCommand}\n`);
} else {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}
