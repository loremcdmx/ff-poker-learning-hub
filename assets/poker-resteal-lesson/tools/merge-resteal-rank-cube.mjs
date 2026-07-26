#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const currentTemplateSha256 = sha256(fs.readFileSync(path.join(here, "resteal-rank-cube.sql")));

const options = Object.fromEntries(process.argv.slice(2).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));
const inputs = String(options.inputs || "").split(",").filter(Boolean).map((item) => path.resolve(item));
const output = options.output && path.resolve(options.output);
const metadataOutput = options.metadata && path.resolve(options.metadata);
const rendererMetadataPaths = String(options["renderer-metadata"] || "").split(",").filter(Boolean).map((item) => path.resolve(item));
const querySha256 = String(options["query-sha256"] || "").split(",").filter(Boolean);
const sourceRefs = String(options["source-refs"] || "").split(",").filter(Boolean);
if (!inputs.length || !output) throw new Error("Usage: node merge-resteal-rank-cube.mjs --inputs=/tmp/a.csv,/tmp/b.csv --output=/tmp/cube.csv");
const hasProvenanceOptions = rendererMetadataPaths.length || querySha256.length || sourceRefs.length;
if (hasProvenanceOptions) {
  if (rendererMetadataPaths.length !== inputs.length) throw new Error(`Expected ${inputs.length} renderer metadata files`);
  if (querySha256.length !== inputs.length) throw new Error(`Expected ${inputs.length} query hashes`);
  if (sourceRefs.length !== inputs.length) throw new Error(`Expected ${inputs.length} source refs`);
}
if (sourceRefs.length) assert.equal(new Set(sourceRefs).size, sourceRefs.length, "Every source execution id must be unique");

const columns = [
  "cohort", "opener_position", "open_size_bb", "depth_band", "holecards_str",
  "opportunities", "folds", "calls", "small3bets", "jams", "other", "first_hand_at", "last_hand_at",
];
const dimensions = columns.slice(0, 5);
const counters = ["opportunities", "folds", "calls", "small3bets", "jams", "other"];
const merged = new Map();
let sourceRows = 0;
const inputMetadata = [];

for (const [inputIndex, input] of inputs.entries()) {
  const sourceBuffer = fs.readFileSync(input);
  const lines = sourceBuffer.toString("utf8").trim().split(/\r?\n/);
  const header = lines.shift()?.split(",") || [];
  if (header.join("|") !== columns.join("|")) throw new Error(`Unexpected columns in ${input}: ${header.join(",")}`);
  let inputRows = 0;
  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    sourceRows += 1;
    inputRows += 1;
    const values = line.split(",");
    if (values.length !== columns.length) throw new Error(`CSV width mismatch in ${input}:${index + 2}`);
    const row = Object.fromEntries(columns.map((column, columnIndex) => [column, values[columnIndex]]));
    const key = dimensions.map((column) => row[column]).join("|");
    if (!merged.has(key)) {
      merged.set(key, {
        ...Object.fromEntries(dimensions.map((column) => [column, row[column]])),
        ...Object.fromEntries(counters.map((counter) => [counter, 0])),
        first_hand_at: row.first_hand_at,
        last_hand_at: row.last_hand_at,
      });
    }
    const target = merged.get(key);
    for (const counter of counters) {
      if (!/^\d+$/.test(row[counter])) throw new Error(`Invalid ${counter} in ${input}:${index + 2}`);
      target[counter] += Number(row[counter]);
    }
    if (row.first_hand_at < target.first_hand_at) target.first_hand_at = row.first_hand_at;
    if (row.last_hand_at > target.last_hand_at) target.last_hand_at = row.last_hand_at;
  }
  const renderer = hasProvenanceOptions ? JSON.parse(fs.readFileSync(rendererMetadataPaths[inputIndex], "utf8")) : null;
  if (renderer) {
    assert.equal(renderer.templateSha256, currentTemplateSha256, `${input}: renderer metadata came from a stale query template`);
    assert.match(renderer.userShard?.userIdsSha256 || "", /^[a-f0-9]{64}$/, `${input}: user-id hash missing`);
    assert.match(querySha256[inputIndex], /^[a-f0-9]{64}$/, `${input}: query hash missing`);
    const executionMode = sourceExecutionMode(sourceRefs[inputIndex], querySha256[inputIndex], input);
    inputMetadata.push({
      file: path.basename(input),
      rows: inputRows,
      sha256: sha256(sourceBuffer),
      sourceRef: sourceRefs[inputIndex],
      executionMode,
      querySha256: querySha256[inputIndex],
      renderer,
    });
    continue;
  }
  inputMetadata.push({
    file: path.basename(input),
    rows: inputRows,
    sha256: sha256(sourceBuffer),
  });
}

let shardStrategy = "unspecified";
if (hasProvenanceOptions) {
  const sameWindow = new Set(inputMetadata.map((item) => JSON.stringify(item.renderer.window))).size === 1;
  if (sameWindow) {
    shardStrategy = "immutable-user-id";
    for (const item of inputMetadata) assert.equal(item.renderer.userShard.count, inputs.length, `${item.file}: user shard count must match all merge inputs`);
    assert.deepEqual(inputMetadata.map((item) => item.renderer.userShard.index).sort((left, right) => left - right), Array.from({ length: inputs.length }, (_, index) => index), "User shard indices must cover 0..count-1 exactly once");
    assert.equal(new Set(inputMetadata.map((item) => item.renderer.userShard.userIdsSha256)).size, inputs.length, "User-id shard hashes must be unique");
    const eligibleUsers = new Set(inputMetadata.map((item) => item.renderer.userShard.eligibleUsers));
    assert.equal(eligibleUsers.size, 1, "Every rank shard must derive from one eligible user population");
    assert.equal(inputMetadata.reduce((sum, item) => sum + item.renderer.shardUsers, 0), inputMetadata[0].renderer.userShard.eligibleUsers, "User shard sizes must reconcile to the eligible population");
  } else {
    shardStrategy = "contiguous-time";
    const ordered = [...inputMetadata].sort((left, right) => left.renderer.window[0].localeCompare(right.renderer.window[0]));
    for (const item of ordered) {
      assert.equal(item.renderer.userShard.index, 0, "A time shard must include the full window-specific user population");
      assert.equal(item.renderer.userShard.count, 1, "A time shard cannot also be split by user id");
    }
    for (let index = 1; index < ordered.length; index += 1) {
      assert.equal(ordered[index - 1].renderer.window[1], ordered[index].renderer.window[0], "Time shards must be contiguous and non-overlapping");
    }
  }
}

const rows = [...merged.values()].sort((left, right) => dimensions.map((column) => left[column]).join("|").localeCompare(dimensions.map((column) => right[column]).join("|")));
for (const row of rows) {
  if (row.folds + row.calls + row.small3bets + row.jams + row.other !== row.opportunities) throw new Error(`Action partition mismatch: ${dimensions.map((column) => row[column]).join("|")}`);
}
const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => row[column]).join(","))].join("\n") + "\n";
fs.writeFileSync(output, csv);
const totals = Object.fromEntries(counters.map((counter) => [counter, rows.reduce((sum, row) => sum + row[counter], 0)]));
const summary = {
  schema: "ff-resteal-rank-cube-merge-v1",
  shardStrategy,
  inputs: inputMetadata,
  sourceRows,
  mergedRows: rows.length,
  output,
  bytes: Buffer.byteLength(csv),
  sha256: sha256(csv),
  totals,
  firstHandAt: rows.reduce((value, row) => !value || row.first_hand_at < value ? row.first_hand_at : value, ""),
  lastHandAt: rows.reduce((value, row) => !value || row.last_hand_at > value ? row.last_hand_at : value, ""),
};
if (metadataOutput) fs.writeFileSync(metadataOutput, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sourceExecutionMode(sourceRef, querySha, input) {
  if (sourceRef === `sync:${querySha}`) return "sync";
  assert.match(sourceRef || "", /^mcp_ch_job_[a-f0-9]+$/, `${input}: invalid ClickHouse execution id`);
  return "async";
}
