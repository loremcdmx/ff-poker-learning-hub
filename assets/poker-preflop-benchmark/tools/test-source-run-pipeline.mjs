#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = mkdtempSync(resolve(tmpdir(), "ff-preflop-source-run-"));
const sha256 = (source) => createHash("sha256").update(source).digest("hex");
const headers = {
  action: [
    "trainer", "cohort", "hero_position", "opener_position", "open_size",
    "stack_bucket", "hand_class", "opportunities", "folds", "calls",
    "raises", "jams", "other", "first_hand_at", "last_hand_at",
  ].join(","),
  ev: [
    "cohort", "hand_class", "opportunities", "players", "private_player_ids",
    "spot_ev_bb_100", "ev_sum_bb", "folds", "calls", "raises", "jams",
    "fold_pct", "call_pct", "raise_pct", "jam_pct",
  ].join(","),
};
const rows = {
  action: "vs_raise_free,league1,BTN,HJ,2x,30,AA,50,50,0,0,0,0,2023-09-01 00:00:00,2023-09-01 00:00:01",
  ev: "league1,__SPOT__,50,2,101|102,20.00,10.000000000000,20,10,10,10,40.0,20.0,20.0,20.0",
};

try {
  const rankPath = resolve(fixtureDir, "rank-bridge.csv");
  const sourceDir = resolve(fixtureDir, "source");
  writeFileSync(rankPath, [
    "user_id,rang,rank_start_at,rank_end_at",
    "101,4,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "102,16,2023-09-01 00:00:00,2026-07-22 00:00:00",
    "",
  ].join("\n"), { mode: 0o600 });

  execFileSync(process.execPath, [
    resolve(toolDir, "prepare-source-run.mjs"),
    rankPath,
    "--rank-job-id=mcp_bq_job_0123456789abcdef",
    `--output-dir=${sourceDir}`,
  ], { stdio: "ignore" });

  const planPath = resolve(sourceDir, "source-plan.json");
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  assert.throws(() => execFileSync(process.execPath, [
    resolve(toolDir, "prepare-source-run.mjs"),
    rankPath,
    "--rank-job-id=mcp_bq_job_0123456789abcdef",
    `--output-dir=${sourceDir}`,
  ], { stdio: "pipe" }), /source plan already exists/);
  assert.equal(plan.shardCount, 12);
  assert.equal(plan.shards.length, 12);
  assert.equal(plan.strategy, "contiguous-quarterly_time_shards");
  assert.equal(plan.rankBridge.executionMode, "async");
  assert.equal(plan.rankBridge.queryJobId, "mcp_bq_job_0123456789abcdef");
  assert.equal(plan.shards[0].windowStartInclusive, "2023-09-01T00:00:00Z");
  assert.equal(plan.shards.at(-1).windowEndExclusive, "2026-07-22T00:00:00Z");

  for (const shard of plan.shards) {
    for (const kind of ["action", "ev"]) {
      const query = readFileSync(shard[kind].queryPath, "utf8");
      assert(!query.includes("{{"), `${kind} shard ${shard.shardIndex} keeps an unresolved placeholder`);
      assert.equal(statSync(shard[kind].queryPath).mode & 0o777, 0o600);
      writeFileSync(shard[kind].resultPath, `${headers[kind]}\n${rows[kind]}\n`, { mode: 0o600 });
    }
  }

  for (const kind of ["action", "ev"]) {
    const receiptsPath = plan.receiptPaths[kind];
    const receipts = JSON.parse(readFileSync(receiptsPath, "utf8"));
    for (const receipt of receipts.shards) {
      const queryPath = plan.shards[receipt.shardIndex][kind].queryPath;
      receipt.queryJobId = `sync:${sha256(readFileSync(queryPath))}`;
      receipt.executionMode = "sync";
      receipt.durationMs = 10;
      receipt.truncated = false;
    }
    writeFileSync(receiptsPath, `${JSON.stringify(receipts, null, 2)}\n`, { mode: 0o600 });
    const ledgerPath = resolve(sourceDir, `${kind}-shard-ledger.json`);
    execFileSync(process.execPath, [
      resolve(toolDir, "build-shard-ledger.mjs"),
      `--plan=${planPath}`,
      `--kind=${kind}`,
      `--receipts=${receiptsPath}`,
      `--output=${ledgerPath}`,
    ], { stdio: "ignore" });
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
    assert.equal(ledger.shards.length, 12);
    assert(ledger.shards.every((shard) => shard.executionMode === "sync"));
    assert(ledger.shards.every((shard) => shard.rowCount === 1 && shard.truncated === false));
  }

  const recoveryPlanPath = resolve(sourceDir, "source-plan-recovery.json");
  const recoveryPlan = { ...plan, strategy: "contiguous_time_shards" };
  writeFileSync(recoveryPlanPath, `${JSON.stringify(recoveryPlan, null, 2)}\n`, { mode: 0o600 });
  const recoveryLedgerPath = resolve(sourceDir, "action-recovery-ledger.json");
  execFileSync(process.execPath, [
    resolve(toolDir, "build-shard-ledger.mjs"),
    `--plan=${recoveryPlanPath}`,
    "--kind=action",
    `--receipts=${plan.receiptPaths.action}`,
    `--output=${recoveryLedgerPath}`,
  ], { stdio: "ignore" });
  const recoveryLedger = JSON.parse(readFileSync(recoveryLedgerPath, "utf8"));
  assert.equal(recoveryLedger.plan.strategy, "contiguous_time_shards");

  assert.throws(() => execFileSync(process.execPath, [
    resolve(toolDir, "render-preflop-action-cube.mjs"),
    rankPath,
  ], { stdio: "pipe" }), /is disabled because it left the frozen time\/user placeholders unresolved/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

console.log("preflop benchmark source-run pipeline contract: ok");
