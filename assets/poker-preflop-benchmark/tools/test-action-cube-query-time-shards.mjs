#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const toolDir = dirname(fileURLToPath(import.meta.url));
const renderer = resolve(toolDir, "render-action-cube-query.mjs");
const fixtureDir = mkdtempSync(resolve(tmpdir(), "ff-preflop-time-shard-renderer-"));
const rankPath = resolve(fixtureDir, "rank-bridge.csv");

function render(...arguments_) {
  return spawnSync(process.execPath, [renderer, rankPath, ...arguments_], {
    encoding: "utf8",
  });
}

try {
  writeFileSync(rankPath, [
    "user_id,rang,rank_start_at,rank_end_at",
    "8,3,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "9,16,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "10,7,2023-09-01 00:00:00,2023-10-01 00:00:00",
    "",
  ].join("\n"));

  const action = render(
    "--window-start=2025-01-01 00:00:00",
    "--window-end=2025-02-01 00:00:00",
    "--quiet=true",
  );
  assert.equal(action.status, 0, action.stderr);
  assert(action.stdout.includes("(8,3,'2023-09-01 00:00:00','2026-07-22 00:00:00')"));
  assert(action.stdout.includes("(9,16,'2023-09-01 00:00:00','2026-07-22 00:00:00')"));
  assert(action.stdout.includes("PREWHERE h.user_id IN (8,9)"));
  assert(!action.stdout.includes("(10,7,"), "time filtering may exclude a non-overlapping interval");

  const ev = render(
    "--shards=1",
    "--shard=0",
    "--template=ev",
    "--window-start=2025-01-01 00:00:00",
    "--window-end=2025-02-01 00:00:00",
    "--quiet=true",
  );
  assert.equal(ev.status, 0, ev.stderr);
  assert(ev.stdout.includes("PREWHERE h.user_id IN (8,9)"));
  assert(!ev.stdout.includes("{{"), "all query placeholders are resolved");

  const userModuloShard = render(
    "--shards=8",
    "--shard=0",
    "--window-start=2025-01-01 00:00:00",
    "--window-end=2025-02-01 00:00:00",
    "--quiet=true",
  );
  assert.notEqual(userModuloShard.status, 0);
  assert.match(userModuloShard.stderr, /time-shard publication requires the full rank bridge/);

  const nonZeroUserShard = render(
    "--shards=2",
    "--shard=1",
    "--window-start=2025-01-01 00:00:00",
    "--window-end=2025-02-01 00:00:00",
    "--quiet=true",
  );
  assert.notEqual(nonZeroUserShard.status, 0);
  assert.match(nonZeroUserShard.stderr, /partition only with disjoint --window-start\/--window-end time ranges/);

  console.log("preflop benchmark time-shard renderer contract: ok");
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}
