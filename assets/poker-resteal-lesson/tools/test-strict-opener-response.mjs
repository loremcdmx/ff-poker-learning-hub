import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolRoot = new URL("./", import.meta.url);
const builder = new URL("build-strict-opener-response.mjs", toolRoot);
const header = [
  "category", "opener_position", "hero_position", "open_size_bb", "depth_band",
  "response_action", "hand", "response_count", "unique_hands", "unique_opponents",
  "first_hand_at", "last_hand_at", "hero_jams_total", "matched_opener_responses_total",
  "matched_unique_hero_jams_total", "max_responses_per_hero_jam"
].join(",");

function runFixture(rows) {
  const root = mkdtempSync(join(tmpdir(), "resteal-strict-test-"));
  const csv = join(root, "strict.csv");
  const data = join(root, "data");
  writeFileSync(csv, `${header}\n${rows.join("\n")}\n`);
  const result = spawnSync(process.execPath, [fileURLToPath(builder), csv, data, "--job-id", "mcp_ch_job_test_strict"], {
    encoding: "utf8"
  });
  return { root, data, result };
}

function runManifest(shards) {
  const root = mkdtempSync(join(tmpdir(), "resteal-strict-manifest-test-"));
  const data = join(root, "data");
  const manifest = {
    shards: shards.map((shard, index) => {
      const path = join(root, `strict-${index}.csv`);
      writeFileSync(path, `${header}\n${shard.rows.join("\n")}\n`);
      return { path, jobId: `mcp_ch_job_test_shard_${index}`, windowStart: shard.windowStart, windowEnd: shard.windowEnd };
    })
  };
  const manifestPath = join(root, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const result = spawnSync(process.execPath, [fileURLToPath(builder), "--manifest", manifestPath, "--data-dir", data], { encoding: "utf8" });
  return { root, data, result };
}

const controls = "4,3,3,1";
const valid = runFixture([
  `good_reg,BTN,BB,2.0,25-30,F,AKo,1,1,1,2026-01-01 00:00:00,2026-01-01 00:00:00,${controls}`,
  `passive_fish,CO,SB,2.5,35-40,C,QJo,1,1,1,2026-01-02 00:00:00,2026-01-02 00:00:00,${controls}`,
  `passive_fish,CO,SB,2.5,35-40,R,AA,1,1,1,2026-01-03 00:00:00,2026-01-03 00:00:00,${controls}`
]);
try {
  assert.equal(valid.result.status, 0, valid.result.stderr || valid.result.stdout);
  const detailed = JSON.parse(readFileSync(join(valid.data, "field-opener-response.json"), "utf8"));
  const vsJam = JSON.parse(readFileSync(join(valid.data, "field_vs_jam.json"), "utf8"));
  const callRange = JSON.parse(readFileSync(join(valid.data, "field_call_range.json"), "utf8"));
  assert.equal(detailed.meta.source.mcpJobId, "mcp_ch_job_test_strict");
  assert.match(detailed.meta.source.querySha256, /^[a-f0-9]{64}$/);
  assert.equal(detailed.meta.source.querySha256, detailed.meta.source.templateQuerySha256, "single full-window query equals its template");
  assert.equal(detailed.meta.source.heroJamsTotal, 4);
  assert.equal(detailed.meta.source.matchedOpenerResponsesTotal, 3);
  assert.equal(detailed.meta.source.matchedUniqueHeroJamsTotal, 3);
  assert.equal(detailed.meta.source.maxResponsesPerHeroJam, 1);
  assert.equal(detailed.meta.source.candidateResponsesTotal, 3);
  assert.equal(detailed.meta.source.ambiguousHeroJamsTotal, 0);
  assert.equal(detailed.meta.source.maxCandidateResponsesPerHeroJam, 1);
  assert.equal(detailed.meta.source.matchPct, 75);
  assert.deepEqual(vsJam.pooled.good_reg, { n_faced: 1, fold_pct: 1, continue_pct: 0 });
  assert.deepEqual(vsJam.pooled.passive_fish, { n_faced: 2, fold_pct: 0, continue_pct: 1 });
  assert.equal(callRange.by_category.passive_fish.n_total, 2);
  assert.deepEqual(callRange.by_category.passive_fish.act_split, { C: 1, R: 1 });
  assert.deepEqual(callRange.by_category.passive_fish.hands, { QJo: 1, AA: 1 });
} finally {
  rmSync(valid.root, { recursive: true, force: true });
}

const sharded = runManifest([
  {
    windowStart: "2026-01-01T00:00:00Z",
    windowEnd: "2026-04-01T00:00:00Z",
    rows: ["good_reg,BTN,BB,2.0,25-30,F,AKo,1,1,1,2026-01-01 00:00:00,2026-01-01 00:00:00,2,1,1,1"]
  },
  {
    windowStart: "2026-04-01T00:00:00Z",
    windowEnd: "2026-07-17T00:00:00Z",
    rows: [
      "passive_fish,CO,SB,2.5,35-40,C,QJo,1,1,1,2026-04-02 00:00:00,2026-04-02 00:00:00,2,2,2,1",
      "passive_fish,CO,SB,2.5,35-40,R,AA,1,1,1,2026-04-03 00:00:00,2026-04-03 00:00:00,2,2,2,1"
    ]
  }
]);
try {
  assert.equal(sharded.result.status, 0, sharded.result.stderr || sharded.result.stdout);
  const detailed = JSON.parse(readFileSync(join(sharded.data, "field-opener-response.json"), "utf8"));
  assert.equal(detailed.meta.source.heroJamsTotal, 4);
  assert.equal(detailed.meta.source.matchedOpenerResponsesTotal, 3);
  assert.equal(detailed.meta.source.matchPct, 75);
  assert.equal(detailed.meta.source.shards.length, 2);
  assert.deepEqual(detailed.meta.source.mcpJobIds, ["mcp_ch_job_test_shard_0", "mcp_ch_job_test_shard_1"]);
  assert.match(detailed.meta.source.sha256, /^[a-f0-9]{64}$/);
  assert.match(detailed.meta.source.templateQuerySha256, /^[a-f0-9]{64}$/);
  assert.equal(new Set(detailed.meta.source.shards.map((shard) => shard.querySha256)).size, 2, "each rendered shard query has its own SHA");
  assert.ok(detailed.meta.source.shards.every((shard) => /^[a-f0-9]{64}$/.test(shard.querySha256)));
} finally {
  rmSync(sharded.root, { recursive: true, force: true });
}

const ambiguityExcluded = runFixture([
  "good_reg,BTN,BB,2.0,25-30,F,AKo,50,50,20,2026-01-01 00:00:00,2026-01-31 00:00:00,100,52,51,2"
]);
try {
  assert.equal(ambiguityExcluded.result.status, 0, ambiguityExcluded.result.stderr || ambiguityExcluded.result.stdout);
  const detailed = JSON.parse(readFileSync(join(ambiguityExcluded.data, "field-opener-response.json"), "utf8"));
  assert.equal(detailed.meta.source.matchedOpenerResponsesTotal, 50, "only exactly-one candidate rows enter the strict output");
  assert.equal(detailed.meta.source.matchedUniqueHeroJamsTotal, 50);
  assert.equal(detailed.meta.source.candidateResponsesTotal, 52);
  assert.equal(detailed.meta.source.candidateUniqueHeroJamsTotal, 51);
  assert.equal(detailed.meta.source.ambiguousHeroJamsTotal, 1);
  assert.equal(detailed.meta.source.ambiguousCandidateResponsesTotal, 2);
  assert.equal(detailed.meta.source.maxCandidateResponsesPerHeroJam, 2);
  assert.equal(detailed.meta.source.maxResponsesPerHeroJam, 1);
} finally {
  rmSync(ambiguityExcluded.root, { recursive: true, force: true });
}

const duplicate = runFixture([
  "good_reg,BTN,BB,2.0,25-30,F,AKo,2,1,1,2026-01-01 00:00:00,2026-01-01 00:00:00,2,2,2,1"
]);
try {
  assert.notEqual(duplicate.result.status, 0, "builder must reject duplicate physical hands within a cell");
  assert.match(duplicate.result.stderr, /duplicate physical hands/);
} finally {
  rmSync(duplicate.root, { recursive: true, force: true });
}

const lowCoverage = runFixture([
  "good_reg,BTN,BB,2.0,25-30,F,AKo,1,1,1,2026-01-01 00:00:00,2026-01-01 00:00:00,3,1,1,1"
]);
try {
  assert.notEqual(lowCoverage.result.status, 0, "builder must reject unexpectedly low opener-match coverage");
  assert.match(lowCoverage.result.stderr, /Unexpected strict opener match coverage/);
} finally {
  rmSync(lowCoverage.root, { recursive: true, force: true });
}

console.log("PASS strict opener-response builder: provenance, one-to-one reconciliation and coverage guards");
