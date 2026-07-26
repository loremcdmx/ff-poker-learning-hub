#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");

export const PUBLIC_DATA_ASSETS = Object.freeze([
  {
    file: "assets/poker-rfi-open-lesson/field-action-data.js",
    maximumSentinelBytes: 2500,
    aggregatePatterns: [/"opportunities"\s*:/, /"minimumCellOpportunities"\s*:/]
  },
  {
    file: "assets/poker-resteal-lesson/data/resteal-rank-data.js",
    maximumSentinelBytes: 2000,
    aggregatePatterns: [/"opportunities"\s*:/, /"jams"\s*:/]
  },
  {
    file: "assets/poker-vs-3bet-defense-lesson/data/vs3bet-field-data.js",
    maximumSentinelBytes: 2000,
    aggregatePatterns: [/"opportunities"\s*:/, /"actions"\s*:/]
  },
  {
    file: "assets/poker-flop-cbet-hu-lesson/data.js",
    maximumSentinelBytes: 2000,
    aggregatePatterns: [/"opportunities"\s*:/, /"sample"\s*:/]
  },
  {
    file: "assets/poker-preflop-benchmark/field-data.js",
    maximumSentinelBytes: 2000,
    aggregatePatterns: [/"opportunities"\s*:/, /"actions"\s*:/]
  },
  {
    file: "assets/poker-preflop-benchmark/spot-ev-data.js",
    maximumSentinelBytes: 2000,
    aggregatePatterns: [/"opportunities"\s*:/, /"netEv"\s*:/]
  }
]);

const rawEvidencePatterns = Object.freeze([
  {
    pattern: /(?:^|["'(\s])(?:\/private\/tmp|\/var\/folders|\/Users\/|\/tmp\/|[A-Za-z]:\\Users\\)/,
    label: "private absolute path"
  },
  {
    pattern: /(?:["']?private(?:Sql|Csv|Json|Path)["']?)\s*:/i,
    label: "private input pointer"
  },
  {
    pattern: /(?:["']?(?:user_id|player_id|hand_player_id|tournament_player_id)["']?)\s*:/i,
    label: "raw identifier field"
  },
  {
    pattern: /(?:["']?(?:userIds|user_ids|playerIds|player_ids|handPlayerIds|hand_player_ids)["']?)\s*:\s*\[/i,
    label: "raw identifier collection"
  },
  {
    pattern: /^(?:[^,\n]+,)*(?:user_id|player_id|hand_player_id)(?:,|$)/im,
    label: "raw identifier CSV"
  },
  {
    pattern: /["']?failedAttempts["']?\s*:/,
    label: "failed extraction attempt log"
  },
  {
    pattern: /\b(?:SELECT|WITH)\s+[\s\S]{0,800}\bFROM\s+(?:analytics(?:_mcp_readonly)?\.|default\.|dm_|int_tracker)/i,
    label: "embedded source query"
  },
  {
    pattern: /\{\{(?:RANK_USER_IDS|USER_IDS|PLAYER_IDS)\}\}/,
    label: "private query placeholder"
  },
  {
    pattern: /(?:hand-cube|rank-intervals|source-metadata)\.(?:csv|json)/i,
    label: "private source cube path"
  }
]);

export function validatePublicDataSource({
  file,
  source,
  maximumSentinelBytes,
  aggregatePatterns
}) {
  assert.equal(typeof source, "string", `${file}: public data source must be text`);
  for (const { pattern, label } of rawEvidencePatterns) {
    assert.doesNotMatch(source, pattern, `${file}: ${label} must not ship in a public aggregate`);
  }

  const isAggregate = aggregatePatterns.some((pattern) => pattern.test(source));
  if (isAggregate) {
    return "ready_aggregate";
  }

  assert(
    Buffer.byteLength(source) <= maximumSentinelBytes,
    `public methodology sentinel is unexpectedly large: ${file}`
  );
  assert.match(source, /methodology_only/, `public sentinel lacks explicit methodology_only status: ${file}`);
  for (const pattern of aggregatePatterns) {
    assert.doesNotMatch(source, pattern, `observed counters leaked into methodology sentinel: ${file}`);
  }
  return "methodology_only";
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function checkPublicDataBoundary() {
  const ignorePath = path.join(root, ".vercelignore");
  const ignoreRules = new Set(fs.readFileSync(ignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")));

  const broadRules = ["assets/**/tools/**", "assets/**/research/**"];
  const exactQuarantineRules = [
    "assets/poker-resteal-lesson/data/resteal-rank-hand-cube.csv",
    "assets/poker-resteal-lesson/data/resteal-rank-diagnostics.json",
    "assets/poker-resteal-lesson/data/resteal-rank-source-metadata.json",
    "assets/poker-resteal-lesson/data/resteal-rank-README.md",
    "assets/poker-vs-3bet-defense-lesson/data/vs3bet-field-diagnostics.json",
    "assets/poker-vs-3bet-defense-lesson/data/vs3bet-version-drift-audit.json"
  ];

  assert(![...ignoreRules].some((rule) => rule.startsWith("!")), "negated Vercel rules can silently re-include quarantined evidence");
  for (const rule of [...broadRules, ...exactQuarantineRules]) {
    assert(ignoreRules.has(rule), `missing Vercel exclusion: ${rule}`);
  }

  const relative = (absolute) => path.relative(root, absolute).split(path.sep).join("/");
  const isIgnored = (relativePath) => {
    if (relativePath.startsWith("assets/") && relativePath.includes("/tools/")) return ignoreRules.has("assets/**/tools/**");
    if (relativePath.startsWith("assets/") && relativePath.includes("/research/")) return ignoreRules.has("assets/**/research/**");
    return ignoreRules.has(relativePath);
  };

  const assetFiles = walk(path.join(root, "assets")).map(relative);
  const evidenceLike = assetFiles.filter((file) =>
    file.includes("/tools/")
    || file.includes("/research/")
    || /(?:diagnostics|source-metadata|drift-audit)/.test(file)
    || /resteal-rank-README\.md$/.test(file)
    || /hand-cube\.csv$/.test(file));
  for (const file of evidenceLike) assert(isIgnored(file), `build evidence would be deployed: ${file}`);

  const ignoredBasenames = new Set(exactQuarantineRules.map((file) => path.basename(file)));
  const publicCodeFiles = [
    ...fs.readdirSync(root).filter((file) => file.endsWith(".html")),
    ...assetFiles.filter((file) => file.endsWith(".js") && !isIgnored(file))
  ];
  for (const codePath of publicCodeFiles) {
    const source = fs.readFileSync(path.join(root, codePath), "utf8");
    const dynamicBuildPath = /(?:fetch|import|new\s+(?:Shared)?Worker)\s*\(\s*["'`][^"'`]*(?:\/tools\/|\/research\/)/;
    assert.doesNotMatch(source, dynamicBuildPath, `${codePath} dynamically requests a build-only path`);
    if (!codePath.endsWith(".html")) continue;
    assert.doesNotMatch(source, /(?:src|href)=["'][^"']*\/\b(?:tools|research)\//, `${codePath} references a build-only path`);
    for (const basename of ignoredBasenames) {
      assert(!source.includes(basename), `${codePath} references quarantined artifact ${basename}`);
    }
  }

  const modes = { methodology_only: 0, ready_aggregate: 0 };
  for (const spec of PUBLIC_DATA_ASSETS) {
    const source = fs.readFileSync(path.join(root, spec.file), "utf8");
    modes[validatePublicDataSource({ ...spec, source })] += 1;
  }

  console.log(
    `public data boundary ok: ${evidenceLike.length} build/evidence files excluded; `
    + `${modes.ready_aggregate} ready aggregates; ${modes.methodology_only} methodology sentinels`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  checkPublicDataBoundary();
}
