#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputFlag = process.argv.indexOf("--output");
const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : "";
const metadataFlag = process.argv.indexOf("--metadata");
const metadataPath = metadataFlag >= 0 ? process.argv[metadataFlag + 1] : "";
const partitionFlag = process.argv.indexOf("--partition");
const partitionAxis = partitionFlag >= 0 ? process.argv[partitionFlag + 1] : "";
const inputs = process.argv.slice(2).filter((value, index, all) => {
  if (["--output", "--metadata", "--partition"].includes(value)) return false;
  if (index > 0 && ["--output", "--metadata", "--partition"].includes(all[index - 1])) return false;
  return true;
});
if (!outputPath || inputs.length < 2) {
  throw new Error("Usage: node merge-action-cube-shards.mjs <shard.csv> <shard.csv> [...] --partition time|user --output <cube.csv> [--metadata <json>]");
}
if (metadataFlag >= 0 && !metadataPath) throw new Error("--metadata requires a JSON path");
if (!new Set(["time", "user"]).has(partitionAxis)) throw new Error("--partition must be exactly time or user");

const keyColumns = ["trainer", "cohort", "hero_position", "opener_position", "open_size", "stack_bucket", "hand_class"];
const sumColumns = ["opportunities", "folds", "calls", "raises", "jams", "other"];
// Exact action counters are additive across disjoint time/user shards. Distinct
// players and months are not: the same player or month can appear in more than
// one shard. They are deliberately excluded from the merged learner source;
// date coverage is reconstructed from exact shard bounds.
const ignoredNonAdditiveColumns = ["players", "months"];
const outputColumns = [...keyColumns, ...sumColumns, "first_hand_at", "last_hand_at"];
const grouped = new Map();

function parseCsv(path) {
  const [headerLine, ...lines] = readFileSync(resolve(path), "utf8").trim().split(/\r?\n/);
  const header = headerLine.split(",");
  for (const column of [...keyColumns, ...sumColumns, "first_hand_at", "last_hand_at"]) {
    assert(header.includes(column), `${path}: missing ${column}`);
  }
  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    assert.equal(values.length, header.length, `${path}: malformed CSV row`);
    return Object.fromEntries(header.map((column, index) => [column, values[index]]));
  });
}

for (const input of inputs) {
  for (const row of parseCsv(input)) {
    const key = keyColumns.map((column) => row[column]).join("|");
    const merged = grouped.get(key) || Object.fromEntries([
      ...keyColumns.map((column) => [column, row[column]]),
      ...sumColumns.map((column) => [column, 0]),
      ["first_hand_at", row.first_hand_at],
      ["last_hand_at", row.last_hand_at],
    ]);
    for (const column of sumColumns) {
      const value = Number(row[column]);
      assert(Number.isSafeInteger(value) && value >= 0, `${input}/${key}: ${column} must be a non-negative integer`);
      merged[column] += value;
    }
    if (row.first_hand_at && (!merged.first_hand_at || row.first_hand_at < merged.first_hand_at)) merged.first_hand_at = row.first_hand_at;
    if (row.last_hand_at && (!merged.last_hand_at || row.last_hand_at > merged.last_hand_at)) merged.last_hand_at = row.last_hand_at;
    grouped.set(key, merged);
  }
}

const rows = [...grouped.values()].sort((a, b) => keyColumns.map((column) => a[column]).join("|").localeCompare(keyColumns.map((column) => b[column]).join("|")));
for (const row of rows) {
  assert.equal(row.folds + row.calls + row.raises + row.jams + row.other, row.opportunities, `${keyColumns.map((column) => row[column]).join("|")}: action counters cover every opportunity`);
}
const outputSource = `${outputColumns.join(",")}\n${rows.map((row) => outputColumns.map((column) => row[column]).join(",")).join("\n")}\n`;
writeFileSync(resolve(outputPath), outputSource);
const summary = {
  schema: "ff-preflop-benchmark-action-merge-v1",
  partitionAxis,
  shards: inputs.length,
  rows: rows.length,
  opportunities: rows.reduce((sum, row) => sum + row.opportunities, 0),
  actions: Object.fromEntries(["folds", "calls", "raises", "jams", "other"].map((column) => [column, rows.reduce((sum, row) => sum + row[column], 0)])),
  firstHandAt: rows.reduce((value, row) => !value || row.first_hand_at < value ? row.first_hand_at : value, ""),
  lastHandAt: rows.reduce((value, row) => !value || row.last_hand_at > value ? row.last_hand_at : value, ""),
  sha256: createHash("sha256").update(outputSource).digest("hex"),
  ignoredNonAdditiveColumns,
  inputs: inputs.map((path) => ({
    file: resolve(path).split("/").pop(),
    sha256: createHash("sha256").update(readFileSync(resolve(path))).digest("hex"),
  })),
};
if (metadataPath) writeFileSync(resolve(metadataPath), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
