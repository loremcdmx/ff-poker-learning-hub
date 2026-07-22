#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const rankPath = process.argv[2];
const sourceIndex = process.argv.indexOf("--source");
const sourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : "";
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : "";
if (!rankPath) throw new Error("Usage: node render-preflop-action-cube.mjs <rank-intervals.csv> [--source <template.sql>] [--output <query.sql>]");
if (sourceIndex >= 0 && !sourcePath) throw new Error("--source requires a SQL template path");
if (outputIndex >= 0 && !outputPath) throw new Error("--output requires a file path");

const [header, ...rows] = readFileSync(resolve(rankPath), "utf8").trim().split(/\r?\n/);
assert.equal(header, "user_id,rang,rank_start_at,rank_end_at");
const tuples = rows.map((line, index) => {
  const [userId, rank, startAt, endAt] = line.split(",");
  assert(/^\d+$/.test(userId), `bad user_id on row ${index + 2}`);
  assert(/^\d+$/.test(rank), `bad rank on row ${index + 2}`);
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(startAt), `bad start on row ${index + 2}`);
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(endAt), `bad end on row ${index + 2}`);
  return `(${userId},${rank},'${startAt}','${endAt}')`;
});
assert(tuples.length > 0, "rank bridge is empty");

const source = readFileSync(sourcePath ? resolve(sourcePath) : resolve(toolDir, "msp-preflop-action-cube.sql"), "utf8");
const clickhouseStart = source.indexOf("WITH rank_intervals AS (");
assert(clickhouseStart >= 0, "ClickHouse query marker missing");
const query = source.slice(clickhouseStart).replace("{{RANK_INTERVAL_ROWS}}", tuples.join(",\n    "));
assert(!query.includes("{{RANK_INTERVAL_ROWS}}"), "rank placeholder was not replaced");

if (outputPath) writeFileSync(resolve(outputPath), `${query.trim()}\n`);
else process.stdout.write(`${query.trim()}\n`);
