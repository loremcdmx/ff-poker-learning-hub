import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const html = readFileSync(resolve(repoRoot, "rfi-open-position-lesson.html"), "utf8");
const docs = readFileSync(resolve(repoRoot, "docs/RFI_FIELD_EVIDENCE.md"), "utf8");
const sql = readFileSync(resolve(here, "q_ff_rfi_position_pressure.sql"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

// Exact raw counters from job mcp_ch_job_9c70a38dce7649beb5abbfc0fe7f14ef.
// Result CSV SHA-256: ab44bd36c730097629449a16e69b2813ba754835380b621e1b9b65f3301e7707.
const CSV_FIXTURE = `position,position_label,players_behind,players,rfi_opportunities,rfi_including_shoves,excluded_open_shoves,regular_opens,fold_through_count,fold_through_pct,reraised_count,reraised_pct,old_proxy_count,old_proxy_pct,old_proxy_false_positive_count,old_proxy_rf_face4_count,position_lookup_mismatch,first_hand,last_hand
4,EP,6,1120,2099127,456284,637,455647,46077,10.1124,156143,34.2684,57340,12.5843,11263,11162,17435,2026-01-01T00:00:57,2026-07-11T23:54:59
3,MP,5,1120,1592519,408818,611,408207,48430,11.8641,129215,31.6543,56618,13.8699,8188,8127,12896,2026-01-01T00:01:11,2026-07-11T23:55:02
2,HJ,4,1118,1167919,356995,592,356403,49668,13.9359,104886,29.429,55390,15.5414,5722,5692,9022,2026-01-01T00:00:15,2026-07-11T23:54:45
1,CO,3,1118,820372,348662,955,347707,58031,16.6896,94023,27.0409,62167,17.8791,4136,4120,6269,2026-01-01T00:00:02,2026-07-11T23:54:49
0,BTN,2,1117,533076,350190,2746,347444,73473,21.1467,81229,23.379,75742,21.7998,2269,2266,3681,2026-01-01T00:00:44,2026-07-11T23:54:50
9,SB,1,1116,278812,150911,10394,140517,64065,45.5923,16632,11.8363,64065,45.5923,0,0,4,2026-01-01T00:01:04,2026-07-11T23:53:47`;

const [headerLine, ...lines] = CSV_FIXTURE.trim().split("\n");
const headers = headerLine.split(",");
const numericFields = new Set(headers.slice(0, 17).filter((field) => field !== "position_label"));
const rows = lines.map((line) => {
  const values = line.split(",");
  return Object.fromEntries(headers.map((field, index) => [
    field,
    numericFields.has(field) ? Number(values[index]) : values[index],
  ]));
});

const formatCount = (value) => value.toLocaleString("en-US");
const formatPct = (count, denominator, digits) => (100 * count / denominator).toFixed(digits);
const sum = (field) => rows.reduce((total, row) => total + row[field], 0);

assert.equal(rows.length, 6, "strict position-pressure fixture must cover six RFI positions");
assert.equal(sum("regular_opens"), 2055925, "regular-open denominator total drifted");
assert.equal(sum("excluded_open_shoves"), 15935, "excluded direct-open-shove total drifted");
assert.equal(sum("old_proxy_false_positive_count"), 31578, "old-proxy false-positive total drifted");
assert.equal(sum("old_proxy_rf_face4_count"), 31367, "RF plus face-4bet diagnostic total drifted");
assert.equal(sum("position_lookup_mismatch"), 49307, "position lookup mismatch diagnostic drifted");

for (const row of rows) {
  const foldPct = formatPct(row.fold_through_count, row.regular_opens, 4);
  const reraisedPct = formatPct(row.reraised_count, row.regular_opens, 4);
  const oldProxyPct = formatPct(row.old_proxy_count, row.regular_opens, 4);

  assert.equal(foldPct, Number(row.fold_through_pct).toFixed(4), `${row.position_label} strict fold-through percentage drifted`);
  assert.equal(reraisedPct, Number(row.reraised_pct).toFixed(4), `${row.position_label} reraised percentage drifted`);
  assert.equal(oldProxyPct, Number(row.old_proxy_pct).toFixed(4), `${row.position_label} old-proxy percentage drifted`);
  assert.equal(
    row.old_proxy_count - row.fold_through_count,
    row.old_proxy_false_positive_count,
    `${row.position_label} old-proxy false-positive reconciliation drifted`,
  );
  assert.ok(
    row.old_proxy_false_positive_count >= row.old_proxy_rf_face4_count,
    `${row.position_label} RF plus face-4bet subset exceeds all false positives`,
  );

  const expectedDocRow = `| ${row.position_label} | ${row.players_behind} | ${formatCount(row.regular_opens)} | ${formatCount(row.excluded_open_shoves)} | ${formatCount(row.fold_through_count)} (${foldPct}%) | ${formatCount(row.reraised_count)} (${reraisedPct}%) | ${formatCount(row.old_proxy_count)} (${oldProxyPct}%) | ${formatCount(row.old_proxy_false_positive_count)} |`;
  assert.ok(docs.includes(expectedDocRow), `${row.position_label} documentation row does not match raw counters`);

  const htmlRow = html.match(new RegExp(`<tr[^>]*data-position="${row.position_label}"[\\s\\S]*?</tr>`))?.[0];
  assert.ok(htmlRow, `${row.position_label} position-pressure UI row is missing`);

  const foldUi = formatPct(row.fold_through_count, row.regular_opens, 1);
  const reraisedUi = formatPct(row.reraised_count, row.regular_opens, 1);
  const foldFragment = `style="--rate:${foldUi}%"><strong>${foldUi.replace(".", ",")}%</strong>`;
  const reraisedFragment = `style="--rate:${reraisedUi}%"><strong>${reraisedUi.replace(".", ",")}%</strong>`;
  const foldIndex = htmlRow.indexOf(foldFragment);
  const reraisedIndex = htmlRow.indexOf(reraisedFragment);

  assert.ok(foldIndex >= 0, `${row.position_label} strict took-pot-before-flop UI value drifted`);
  assert.ok(reraisedIndex > foldIndex, `${row.position_label} reraised UI value drifted or is out of order`);
}

assert.match(sql, /argMax\(is_preflop_face_4bet,\s*version\)\s+AS faced_4bet/);
assert.match(sql, /argMax\(cnt_flop_players,\s*version\)\s+AS flop_players/);
assert.match(
  sql,
  /countIf\(\s*regular_open\s+AND preflop_actions = 'R'\s+AND ifNull\(flop_players,\s*0\) = 0\s*\)\s+AS fold_through_count/,
);
assert.match(
  sql,
  /countIf\(\s*regular_open\s+AND \(ifNull\(faced_3bet,\s*0\) = 1 OR ifNull\(faced_4bet,\s*0\) = 1\)\s*\)\s+AS reraised_count/,
);
assert.match(
  sql,
  /countIf\(\s*regular_open\s+AND ifNull\(faced_3bet,\s*0\) != 1\s+AND ifNull\(saw_flop,\s*0\) != 1\s+AND NOT\(preflop_actions = 'R' AND ifNull\(flop_players,\s*0\) = 0\)\s*\)\s+AS old_proxy_false_positive_count/,
);
assert.match(sql, /preflop_actions = 'RF'\s+AND ifNull\(faced_4bet,\s*0\) = 1\s*\)\s+AS old_proxy_rf_face4_count/);
assert.doesNotMatch(sql, /AS (?:everyone_folded|everyone_folded_pct|faced_3bet_count|faced_3bet_pct)\b/);

assert.ok(docs.includes("mcp_ch_job_9c70a38dce7649beb5abbfc0fe7f14ef"), "strict ClickHouse job id is missing from evidence");
assert.ok(docs.includes("3376d2837536cbf48a3fb28fb72a34f647c3150eebd8d6391eb1a39351afba15"), "rendered SQL hash is missing from evidence");
assert.ok(docs.includes("ab44bd36c730097629449a16e69b2813ba754835380b621e1b9b65f3301e7707"), "result hash is missing from evidence");
assert.ok(docs.includes("Every percentage below uses the `Regular opens` value in the same row as its denominator."), "denominator disclosure is missing");
assert.ok(html.includes("<span>Забрал</span><small>без флопа</small>"), "strict took-pot-before-flop label is missing");
assert.ok(html.includes("<span>Получил</span><small>ререйз</small>"), "reraised label is missing");
assert.ok(
  packageJson.scripts.check.includes("node assets/poker-rfi-open-lesson/tools/test-position-pressure-evidence.mjs"),
  "position-pressure evidence test is not wired into npm check",
);

console.log("RFI position-pressure evidence contract OK");
