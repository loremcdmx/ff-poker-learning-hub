#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dataRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const sourcePath = join(dataRoot, "field-opener-response.json");
const outputPath = join(dataRoot, "field-exact-bb-btn-2bb.json");
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const slice = { heroPosition: "BB", openerPosition: "BTN", openSizeBb: "2.0", effectiveStackBb: "25-40" };
const superGroupMap = {
  good_reg: "reg", mid_reg: "reg", weak_reg: "reg", nit: "reg",
  aggro_fish: "fish", passive_fish: "fish", semipassive_fish: "fish",
  aggro_sticky: "fish", aggro_foldy: "fish", unknown: "unknown"
};

function emptyResponse() { return { n_faced: 0, folds: 0, calls: 0, reraises: 0 }; }
function emptyRange() { return { n_total: 0, n_known_holecards: 0, unknown_holecards: 0, act_split: { C: 0, R: 0 }, hands: {} }; }
function add(target, key, value) { target[key] = (target[key] || 0) + value; }
function summarize(record) {
  return {
    n_faced: record.n_faced,
    fold_pct: record.n_faced ? Number((record.folds / record.n_faced).toFixed(4)) : 0,
    continue_pct: record.n_faced ? Number(((record.calls + record.reraises) / record.n_faced).toFixed(4)) : 0
  };
}
function addRange(target, row) {
  if (!['C', 'R'].includes(row.responseAction)) return;
  target.n_total += row.n;
  target.act_split[row.responseAction] += row.n;
  if (row.hand === "unknown") target.unknown_holecards += row.n;
  else {
    target.n_known_holecards += row.n;
    add(target.hands, row.hand, row.n);
  }
}

const rows = source.rows.filter((row) => (
  row.heroPosition === slice.heroPosition &&
  row.openerPosition === slice.openerPosition &&
  String(row.openSizeBb) === slice.openSizeBb &&
  ["25-30", "30-35", "35-40"].includes(row.depthBand)
));
if (!rows.length) throw new Error("Exact BB/BTN/2 BB slice is empty");

const categories = [...new Set(rows.map((row) => row.category))].sort();
const responses = Object.fromEntries(categories.map((category) => [category, emptyResponse()]));
const ranges = Object.fromEntries(categories.map((category) => [category, emptyRange()]));
const superGroups = { reg: emptyRange(), fish: emptyRange(), unknown: emptyRange() };
const pooledRange = emptyRange();

for (const row of rows) {
  const response = responses[row.category];
  response.n_faced += row.n;
  if (row.responseAction === "F") response.folds += row.n;
  else if (row.responseAction === "C") response.calls += row.n;
  else if (row.responseAction === "R") response.reraises += row.n;
  addRange(ranges[row.category], row);
  addRange(superGroups[superGroupMap[row.category] || "unknown"], row);
  addRange(pooledRange, row);
}

const output = {
  meta: {
    version: "2026-07-18.1",
    description: "Exact observed response of the original BTN opener to a direct BB resteal jam after a 2 BB open.",
    slice,
    fallbackPolicy: "Category call range below 500 known continuing hands uses the exact-slice reg/fish super-group; then the exact-slice pooled range.",
    source: source.meta.source
  },
  response: Object.fromEntries(categories.map((category) => [category, summarize(responses[category])])),
  callRange: { by_category: ranges, super_groups: superGroups, pooled: pooledRange }
};

writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`PASS exact BB/BTN/2 BB response: ${rows.length} rows, ${rows.reduce((sum, row) => sum + row.n, 0)} responses`);
