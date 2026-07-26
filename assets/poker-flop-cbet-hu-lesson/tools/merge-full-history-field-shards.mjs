#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const options = {};
const inputs = [];
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) options[match[1]] = match[2];
  else inputs.push(arg);
}
if (!inputs.length) {
  throw new Error("Usage: node merge-full-history-field-shards.mjs shard.csv [...] --manifest=/private/tmp/shard-manifest.json --output=/private/tmp/postflop-field-cube.json");
}
if (!options.manifest) throw new Error("A validated --manifest is required before additive merge");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift();
  if (!header) return [];
  return rows.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]))
  );
}

const integerColumns = [
  "opportunities", "checks_back", "cbets", "faced_raises",
  "folds", "calls", "raises", "other"
];
const allowedNodes = new Set(["cbet", "bb_response"]);
const allowedCohorts = new Set(["league1", "league2", "league3", "novice"]);
const allowedDepths = new Set(["<20", "20-30", "30-40", "40-70", "70+"]);
const allowedPositions = {
  cbet: new Set(["BTN", "CO", "HJ", "MP", "EP"]),
  bb_response: new Set(["BTN", "CO"])
};
const merged = new Map();
const sourceFiles = [];
const sourceHashes = new Set();

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const manifestPath = path.resolve(options.manifest);
const manifestBuffer = fs.readFileSync(manifestPath);
const manifest = JSON.parse(manifestBuffer.toString("utf8"));
if (manifest.schemaVersion !== 2) throw new Error("Invalid shard manifest schema");
if (manifest.strategy !== "six_month_time_windows_x_contiguous_user_partitions") throw new Error("Invalid shard manifest strategy");
if (!/^[a-f0-9]{64}$/.test(String(manifest.sourceQueryTemplateSha256 || ""))) {
  throw new Error("Shard manifest source query-template SHA is missing");
}
const rankSource = manifest.rankSource;
if (
  !rankSource
  || !["async", "sync"].includes(rankSource.executionMode)
  || !rankSource.queryJobId
  || !/^[a-f0-9]{64}$/.test(String(rankSource.querySha256 || ""))
  || !/^[a-f0-9]{64}$/.test(String(rankSource.sourceQueryTemplateSha256 || ""))
  || !/^[a-f0-9]{64}$/.test(String(rankSource.resultSha256 || ""))
  || !Number.isSafeInteger(rankSource.rowCount)
  || rankSource.rowCount <= 0
) {
  throw new Error("Shard manifest rank-source provenance is incomplete");
}
if (rankSource.executionMode === "sync" && rankSource.queryJobId !== `sync:${rankSource.querySha256}`) {
  throw new Error("Shard manifest rank-source sync identity is invalid");
}
const expectedWindow = {
  startInclusive: options["window-start"] || "2023-09-01",
  endExclusive: options["window-end"] || "2026-07-22"
};
if (!same(manifest.coverage?.window, expectedWindow) || manifest.coverage?.continuous !== true) {
  throw new Error("Shard manifest does not prove the requested continuous window");
}
if (!same(manifest.coverage?.rankShard, [1, 18]) || manifest.coverage?.userPartitionPolicy !== "sorted_user_offsets_exact_once") {
  throw new Error("Shard manifest must cover ranks 1-18 with exact contiguous user partitions");
}
const manifestWindows = manifest.coverage?.timeWindows;
if (!Array.isArray(manifestWindows) || !manifestWindows.length) throw new Error("Shard manifest time windows are missing");
manifestWindows.forEach((window, index) => {
  if (!window?.from || !window?.to || window.from >= window.to) throw new Error(`Invalid manifest time window ${index}`);
  if (index === 0 && window.from !== expectedWindow.startInclusive) throw new Error("Manifest starts after the requested window");
  if (index > 0 && manifestWindows[index - 1].to !== window.from) throw new Error(`Manifest time gap or overlap before window ${index}`);
  if (index === manifestWindows.length - 1 && window.to !== expectedWindow.endExclusive) throw new Error("Manifest ends before the requested window");
});
if (!Array.isArray(manifest.shards) || manifest.shards.length !== inputs.length || manifest.coverage.shardCount !== inputs.length) {
  throw new Error("Manifest shard count does not match merge inputs");
}
for (const window of manifestWindows) {
  const partitions = manifest.shards
    .filter((shard) => shard.window?.startInclusive === window.from && shard.window?.endExclusive === window.to)
    .sort((left, right) => Number(left.userShard?.startOffset) - Number(right.userShard?.startOffset));
  if (!partitions.length) throw new Error(`Manifest window ${window.from} has no user partitions`);
  if (partitions.some((shard) => !same(shard.rankShard, [1, 18]))) {
    throw new Error(`Manifest window ${window.from} has an invalid rank or user partition`);
  }
  const eligibleUsers = Number(partitions[0].userShard?.eligibleUsers);
  if (
    !Number.isSafeInteger(eligibleUsers)
    || partitions.some((shard) => Number(shard.userShard?.eligibleUsers) !== eligibleUsers)
    || Number(partitions[0].userShard?.startOffset) !== 0
    || partitions.some((shard, index) => (
      index > 0
      && Number(partitions[index - 1].userShard?.endOffsetExclusive) !== Number(shard.userShard?.startOffset)
    ))
    || Number(partitions.at(-1).userShard?.endOffsetExclusive) !== eligibleUsers
  ) {
    throw new Error(`Manifest window ${window.from} does not cover sorted users exactly once`);
  }
}
const manifestResults = new Map();
for (const shard of manifest.shards) {
  const name = shard.result?.name;
  const resultSha256 = shard.result?.sha256;
  if (!name || manifestResults.has(name) || !/^[a-f0-9]{64}$/.test(String(resultSha256 || ""))) {
    throw new Error("Manifest has a duplicate or invalid result entry");
  }
  if (!/^[a-f0-9]{64}$/.test(String(shard.query?.sha256 || ""))) throw new Error(`${shard.id}: manifest query SHA is invalid`);
  if (
    !["async", "sync"].includes(shard.execution?.executionMode)
    || !shard.execution?.queryJobId
    || shard.execution?.querySha256 !== shard.query.sha256
    || !/^[a-f0-9]{64}$/.test(String(shard.execution?.sha256 || ""))
  ) {
    throw new Error(`${shard.id}: manifest execution identity is invalid`);
  }
  if (shard.execution.executionMode === "sync" && shard.execution.queryJobId !== `sync:${shard.execution.querySha256}`) {
    throw new Error(`${shard.id}: manifest sync execution identity is invalid`);
  }
  manifestResults.set(name, shard);
}

for (const input of inputs) {
  const absolute = path.resolve(input);
  const buffer = fs.readFileSync(absolute);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const manifestShard = manifestResults.get(path.basename(absolute));
  if (!manifestShard) throw new Error(`Input ${input} is absent from the manifest`);
  if (manifestShard.result.sha256 !== sha256) throw new Error(`Result SHA differs from manifest for ${input}`);
  if (sourceHashes.has(sha256)) throw new Error(`Duplicate shard content: ${input}`);
  sourceHashes.add(sha256);
  sourceFiles.push({
    name: path.basename(absolute),
    sha256
  });
  const parsedRows = parseCsv(buffer.toString("utf8"));
  if (!parsedRows.length) throw new Error(`Empty shard: ${input}`);
  for (const raw of parsedRows) {
    if (!allowedNodes.has(raw.node)) throw new Error(`Unexpected node ${raw.node} in ${input}`);
    if (!allowedCohorts.has(raw.cohort)) throw new Error(`Unexpected cohort ${raw.cohort} in ${input}`);
    if (!allowedDepths.has(raw.depth_band)) throw new Error(`Unexpected depth ${raw.depth_band} in ${input}`);
    if (!allowedPositions[raw.node].has(raw.position)) throw new Error(`Unexpected position ${raw.position} for ${raw.node} in ${input}`);
    const key = [raw.node, raw.cohort, raw.position, raw.depth_band].join("|");
    const row = merged.get(key) || {
      node: raw.node,
      cohort: raw.cohort,
      position: raw.position,
      depthBand: raw.depth_band,
      opportunities: 0,
      checksBack: 0,
      cbets: 0,
      facedRaises: 0,
      folds: 0,
      calls: 0,
      raises: 0,
      other: 0,
      firstHandAt: "",
      lastHandAt: ""
    };
    for (const column of integerColumns) {
      const value = Number(raw[column]);
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${column}=${raw[column]} for ${key}`);
      const camel = column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      row[camel] += value;
    }
    const first = String(raw.first_hand_at || "");
    const last = String(raw.last_hand_at || "");
    if (first && (!row.firstHandAt || first < row.firstHandAt)) row.firstHandAt = first;
    if (last && (!row.lastHandAt || last > row.lastHandAt)) row.lastHandAt = last;
    merged.set(key, row);
  }
}

const rows = [...merged.values()].sort((left, right) =>
  left.node.localeCompare(right.node)
    || left.cohort.localeCompare(right.cohort)
    || left.position.localeCompare(right.position)
    || left.depthBand.localeCompare(right.depthBand)
);
for (const row of rows) {
  if (row.node === "cbet" && row.checksBack + row.cbets !== row.opportunities) {
    throw new Error(`C-bet actions do not sum to opportunities for ${JSON.stringify(row)}`);
  }
  if (row.node === "cbet" && (row.facedRaises > row.cbets || row.folds || row.calls || row.raises || row.other)) {
    throw new Error(`C-bet row has impossible response counts for ${JSON.stringify(row)}`);
  }
  if (row.node === "bb_response" && row.folds + row.calls + row.raises + row.other !== row.opportunities) {
    throw new Error(`BB actions do not sum to opportunities for ${JSON.stringify(row)}`);
  }
  if (row.node === "bb_response" && (row.checksBack || row.cbets || row.facedRaises)) {
    throw new Error(`BB-response row has impossible c-bet counts for ${JSON.stringify(row)}`);
  }
  if (row.node === "bb_response" && row.other !== 0) {
    throw new Error(`BB-response row has unclassified actions for ${JSON.stringify(row)}`);
  }
  if (!row.firstHandAt || !row.lastHandAt || row.firstHandAt > row.lastHandAt) {
    throw new Error(`Invalid hand-time bounds for ${JSON.stringify(row)}`);
  }
  row.publishable = row.opportunities >= 50;
}
for (const cohort of allowedCohorts) {
  if (!rows.some((row) => row.cohort === cohort && row.node === "cbet")) throw new Error(`Missing c-bet rows for ${cohort}`);
  if (!rows.some((row) => row.cohort === cohort && row.node === "bb_response")) throw new Error(`Missing BB-response rows for ${cohort}`);
}

const aggregate = (node) => {
  const subset = rows.filter((row) => row.node === node);
  const result = { opportunities: 0, checksBack: 0, cbets: 0, facedRaises: 0, folds: 0, calls: 0, raises: 0, other: 0 };
  subset.forEach((row) => {
    Object.keys(result).forEach((key) => { result[key] += row[key]; });
  });
  return result;
};
const artifact = {
  schemaVersion: 1,
  source: {
    table: "analytics.int_tracker_hand_joined",
    rankBridge: "exact_rank_at_hand_half_open",
    window: {
      startInclusive: options["window-start"] || "2023-09-01",
      endExclusive: options["window-end"] || "2026-07-22"
    },
    latest: {
      key: "hand_player_id",
      order: "version_then_complete_projected_tuple"
    },
    cohortBands: {
      league1: [1, 5], league2: [6, 10], league3: [11, 14], novice: [15, 18]
    },
    minimumDenominator: 50,
    shardManifest: {
      name: path.basename(manifestPath),
      sha256: createHash("sha256").update(manifestBuffer).digest("hex"),
      strategy: manifest.strategy,
      continuous: true,
      shardCount: manifest.shards.length,
      userPartitionPolicy: manifest.coverage.userPartitionPolicy,
      windowPartitions: manifest.coverage.windowPartitions,
      sourceQueryTemplateSha256: manifest.sourceQueryTemplateSha256,
      rankSource: manifest.rankSource,
      executions: manifest.shards.map((shard) => ({
        id: shard.id,
        window: shard.window,
        userShard: {
          index: shard.userShard.index,
          count: shard.userShard.count,
          startOffset: shard.userShard.startOffset,
          endOffsetExclusive: shard.userShard.endOffsetExclusive,
          eligibleUsers: shard.userShard.eligibleUsers,
          selectedUserIdsSha256: shard.userShard.selectedUserIdsSha256
        },
        queryJobId: shard.execution.queryJobId,
        executionMode: shard.execution.executionMode,
        querySha256: shard.execution.querySha256,
        resultSha256: shard.result.sha256,
        rowCount: shard.result.rowCount
      }))
    },
    inputFiles: sourceFiles
  },
  totals: {
    cbet: aggregate("cbet"),
    bbResponse: aggregate("bb_response")
  },
  rows
};
const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
if (options.output) fs.writeFileSync(path.resolve(options.output), serialized);
else process.stdout.write(serialized);
