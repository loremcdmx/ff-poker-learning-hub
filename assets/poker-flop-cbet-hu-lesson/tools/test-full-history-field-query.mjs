#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const renderer = path.join(here, "render-full-history-field-query.mjs");
const query = fs.readFileSync(path.resolve(here, "../research/full-history-postflop-field-cube.sql"), "utf8");
const control = fs.readFileSync(path.resolve(here, "../research/full-history-postflop-control.sql"), "utf8");

assert.match(query, /GROUP BY h\.hand_player_id/);
assert.match(query, /argMax\([\s\S]*?h\.version/);
assert.ok(query.indexOf("GROUP BY h.hand_player_id") < query.indexOf("WHERE x.25 = 1"), "latest hand version is selected before poker predicates");
assert.match(query, /l\.x\.2 >= r\.rank_start_at[\s\S]*?l\.x\.2 < r\.rank_end_at/);
assert.match(query, /PREWHERE[\s\S]*?month_start_date[\s\S]*?played_at[\s\S]*?user_id IN/);
const prewhereStart = query.indexOf("  PREWHERE h.month_start_date");
const latestGroupEnd = query.indexOf("  GROUP BY h.hand_player_id", prewhereStart);
const prewhereClause = query.slice(prewhereStart, latestGroupEnd);
assert.doesNotMatch(prewhereClause, /is_rfi|is_flop|position\s*=/);
assert.match(query, /countIf\(made_cbet = 0\) AS checks_back/);
assert.match(query, /countIf\(made_cbet = 1\) AS cbets/);
assert.match(query, /countIf\(folded \+ called \+ raised != 1\) AS other/);
assert.match(
  query,
  /cbet_rows[\s\S]*?x\.6 = 1[\s\S]*?x\.7 = 1[\s\S]*?x\.8 = 1[\s\S]*?x\.9 = 2[\s\S]*?x\.10 = 1[\s\S]*?x\.11 = 1[\s\S]*?match\(x\.15, '\^\[0-7\]8\$'\)/,
  "the c-bet node remains the tracked in-position unopened RFI"
);
assert.match(
  query,
  /bb_response_rows[\s\S]*?x\.3 = 8[\s\S]*?x\.16 = 1[\s\S]*?x\.17 = 4[\s\S]*?x\.18 = 'C'[\s\S]*?x\.19 = 1[\s\S]*?\(x\.20 = 1 OR x\.21 = 1\)[\s\S]*?x\.4 IN \(0, 1\)[\s\S]*?x\.23 = 0[\s\S]*?x\.9 = 2[\s\S]*?x\.26 = 1/,
  "the reverse-Hero node remains BB call versus one late-position RFI, then check/faced c-bet"
);
assert.match(
  query,
  /countIf\(folded = 1\) AS folds[\s\S]*?countIf\(called = 1\) AS calls[\s\S]*?countIf\(raised = 1\) AS raises/,
  "BB fold, call and check-raise share one response denominator"
);
assert.match(control, /NOT the learner-facing source/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-postflop-ranks-"));
const csv = path.join(temp, "ranks.csv");
fs.writeFileSync(csv, [
  "user_id,rang,rank_start_at,rank_end_at",
  "1,5,2023-09-01 00:00:00,2024-01-01 00:00:00",
  "1,4,2024-01-01 00:00:00,2026-07-22 00:00:00",
  "2,15,2026-01-01 00:00:00,2026-07-22 00:00:00",
  "3,3,2025-01-01 00:00:00,2026-07-22 00:00:00"
].join("\n"));
const rendered = spawnSync(process.execPath, [renderer, csv, "--from=2026-06-01", "--to=2026-07-01", "--rank-min=1", "--rank-max=5"], { encoding: "utf8" });
assert.equal(rendered.status, 0, rendered.stderr);
assert.match(rendered.stdout, /\(1,4,'2024-01-01 00:00:00','2026-07-22 00:00:00'\)/);
assert.doesNotMatch(rendered.stdout, /\(2,15,/);
assert.match(rendered.stdout, /\(3,3,'2025-01-01 00:00:00','2026-07-22 00:00:00'\)/);
assert.match(rendered.stdout, /played_at >= toDateTime\('2026-06-01 00:00:00'\)/);
assert.match(rendered.stdout, /played_at < toDateTime\('2026-07-01 00:00:00'\)/);
assert.doesNotMatch(rendered.stdout, /\{\{/);

const shardZero = spawnSync(process.execPath, [renderer, csv, "--from=2026-06-01", "--to=2026-07-01", "--rank-min=1", "--rank-max=5", "--user-shard-index=0", "--user-shard-count=2", "--quiet=true"], { encoding: "utf8" });
const shardOne = spawnSync(process.execPath, [renderer, csv, "--from=2026-06-01", "--to=2026-07-01", "--rank-min=1", "--rank-max=5", "--user-shard-index=1", "--user-shard-count=2", "--quiet=true"], { encoding: "utf8" });
assert.equal(shardZero.status, 0, shardZero.stderr);
assert.equal(shardOne.status, 0, shardOne.stderr);
assert.match(shardZero.stdout, /h\.user_id IN \(1\)/);
assert.doesNotMatch(shardZero.stdout, /\(3,3,/);
assert.match(shardOne.stdout, /h\.user_id IN \(3\)/);
assert.doesNotMatch(shardOne.stdout, /\(1,4,/);

const invalidShard = spawnSync(process.execPath, [renderer, csv, "--user-shard-index=2", "--user-shard-count=2"], { encoding: "utf8" });
assert.notEqual(invalidShard.status, 0);
assert.match(invalidShard.stderr, /Invalid user shard/);

const overlap = path.join(temp, "overlap.csv");
fs.writeFileSync(overlap, [
  "user_id,rang,rank_start_at,rank_end_at",
  "1,5,2026-01-01 00:00:00,2026-07-01 00:00:00",
  "1,4,2026-06-01 00:00:00,2026-07-22 00:00:00"
].join("\n"));
const rejected = spawnSync(process.execPath, [renderer, overlap, "--from=2026-06-01", "--to=2026-07-01"], { encoding: "utf8" });
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /Overlapping rank intervals/);

console.log("full-history postflop query contract: ok");
