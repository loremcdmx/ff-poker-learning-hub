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
  throw new Error("Usage: node merge-spot-ev-shards.mjs <shard.csv> <shard.csv> [...] --partition time|user --output <spot-ev.csv> [--metadata <json>]");
}
if (metadataFlag >= 0 && !metadataPath) throw new Error("--metadata requires a JSON path");
if (!new Set(["time", "user"]).has(partitionAxis)) throw new Error("--partition must be exactly time or user");

const countColumns = ["opportunities", "folds", "calls", "raises", "jams"];
const grouped = new Map();

function parseCsvLine(line) {
  const values = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { values.push(cell); cell = ""; }
    else cell += char;
  }
  assert.equal(quoted, false, "unterminated CSV quote");
  values.push(cell.replace(/\r$/, ""));
  return values;
}

function exactPrivatePlayerIds(value, label) {
  if (!value) return [];
  return value.split(";").map((token) => {
    const playerId = Number(token);
    assert(Number.isSafeInteger(playerId) && playerId > 0, `${label}: invalid private player id`);
    return playerId;
  });
}

// Action and EV numerators are additive across either disjoint user or time
// shards. Distinct players are additive only across disjoint user shards. Time
// shards therefore carry a private semicolon-delimited exact id set, which is
// unioned in memory and discarded before the publishable CSV is written.
for (const input of inputs) {
  const [headerLine, ...lines] = readFileSync(resolve(input), "utf8").trim().split(/\r?\n/);
  const header = parseCsvLine(headerLine);
  const playerColumn = partitionAxis === "time" ? "private_player_ids" : "players";
  for (const column of ["cohort", "hand_class", "ev_sum_bb", playerColumn, ...countColumns]) {
    assert(header.includes(column), `${input}: missing ${column}`);
  }
  for (const line of lines.filter(Boolean)) {
    const values = parseCsvLine(line);
    assert.equal(values.length, header.length, `${input}: malformed CSV row`);
    const row = Object.fromEntries(header.map((column, index) => [column, values[index]]));
    const key = `${row.cohort}|${row.hand_class}`;
    const merged = grouped.get(key) || {
      cohort: row.cohort,
      hand_class: row.hand_class,
      ev_sum_bb: 0,
      players: 0,
      privatePlayerIds: new Set(),
      ...Object.fromEntries(countColumns.map((column) => [column, 0])),
    };
    const evSumBb = Number(row.ev_sum_bb);
    assert(Number.isFinite(evSumBb), `${input}/${key}: ev_sum_bb must be finite`);
    merged.ev_sum_bb += evSumBb;
    for (const column of countColumns) {
      const value = Number(row[column]);
      assert(Number.isSafeInteger(value) && value >= 0, `${input}/${key}: ${column} must be a non-negative integer`);
      merged[column] += value;
    }
    if (partitionAxis === "user") {
      const players = Number(row.players);
      assert(Number.isSafeInteger(players) && players >= 0, `${input}/${key}: players must be a non-negative integer`);
      merged.players += players;
    }
    else for (const playerId of exactPrivatePlayerIds(row.private_player_ids, `${input}/${key}`)) merged.privatePlayerIds.add(playerId);
    grouped.set(key, merged);
  }
}

const percent = (value, total) => (100 * value / total).toFixed(1);
const rows = [...grouped.values()].sort((a, b) => `${a.cohort}|${a.hand_class}`.localeCompare(`${b.cohort}|${b.hand_class}`));
const header = ["cohort", "hand_class", "opportunities", "players", "spot_ev_bb_100", "ev_sum_bb", "folds", "calls", "raises", "jams", "fold_pct", "call_pct", "raise_pct", "jam_pct"];
for (const row of rows) {
  assert.equal(row.folds + row.calls + row.raises + row.jams, row.opportunities, `${row.cohort}/${row.hand_class}: actions cover every opportunity`);
  if (partitionAxis === "time") row.players = row.privatePlayerIds.size;
  assert(Number.isSafeInteger(row.players) && row.players > 0 && row.players <= row.opportunities, `${row.cohort}/${row.hand_class}: exact player count must fit the opportunities`);
  row.spot_ev_bb_100 = (100 * row.ev_sum_bb / row.opportunities).toFixed(2);
  row.ev_sum_bb = row.ev_sum_bb.toFixed(12);
  row.fold_pct = percent(row.folds, row.opportunities);
  row.call_pct = percent(row.calls, row.opportunities);
  row.raise_pct = percent(row.raises, row.opportunities);
  row.jam_pct = percent(row.jams, row.opportunities);
}
const outputSource = `${header.join(",")}\n${rows.map((row) => header.map((column) => row[column]).join(",")).join("\n")}\n`;
writeFileSync(resolve(outputPath), outputSource);
const summary = {
  schema: "ff-preflop-benchmark-ev-merge-v1",
  partitionAxis,
  shards: inputs.length,
  rows: rows.length,
  opportunities: rows.filter((row) => row.hand_class === "__SPOT__").reduce((sum, row) => sum + row.opportunities, 0),
  sha256: createHash("sha256").update(outputSource).digest("hex"),
  playerCardinality: partitionAxis === "time"
    ? { method: "exact_union_private_user_ids", privateIdentifiersDiscarded: true }
    : { method: "sum_disjoint_user_shards", privateIdentifiersDiscarded: true },
  inputs: inputs.map((path) => ({
    file: resolve(path).split("/").pop(),
    sha256: createHash("sha256").update(readFileSync(resolve(path))).digest("hex"),
  })),
};
if (metadataPath) writeFileSync(resolve(metadataPath), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
