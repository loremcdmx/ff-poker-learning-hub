#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const membershipPath = process.argv[2];
const options = Object.fromEntries(process.argv.slice(3).map((item) => {
  const match = item.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${item}`);
  return [match[1], match[2]];
}));

if (!membershipPath) {
  throw new Error(
    "Usage: node render-missing-cards-recovery-query.mjs /private/path/membership.csv "
    + "[--mode=full-cube|recovery-counters|validation] [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]"
  );
}

const allowedModes = new Set(["full-cube", "recovery-counters", "validation"]);
const mode = options.mode || "full-cube";
if (!allowedModes.has(mode)) throw new Error(`Unsupported mode ${mode}`);

const validationWindow = ["2026-07-01", "2026-07-02"];
const defaultTo = new Date().toISOString().slice(0, 10);
const from = options.from || (mode === "validation" ? validationWindow[0] : "2023-09-01");
const to = options.to || (mode === "validation" ? validationWindow[1] : defaultTo);
if (mode === "validation" && (from !== validationWindow[0] || to !== validationWindow[1])) {
  throw new Error(
    `Validation mode is pinned to ${validationWindow[0]}..${validationWindow[1]} (exclusive)`
  );
}
for (const [label, value] of [["from", from], ["to", to]]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${label} date ${value}`);
}
const fromDate = new Date(`${from}T00:00:00Z`);
const toDate = new Date(`${to}T00:00:00Z`);
if (!(fromDate < toDate)) throw new Error("The extraction window must be non-empty");

const userShardIndex = Number(options["user-shard-index"] ?? 0);
const userShardCount = Number(options["user-shard-count"] ?? 1);
if (
  !Number.isInteger(userShardIndex)
  || !Number.isInteger(userShardCount)
  || userShardCount < 1
  || userShardIndex < 0
  || userShardIndex >= userShardCount
) {
  throw new Error(`Invalid user shard ${userShardIndex}/${userShardCount}`);
}

const output = options.output ? path.resolve(options.output) : "";
const metadataOutput = options["metadata-output"] ? path.resolve(options["metadata-output"]) : "";
for (const candidate of [output, metadataOutput]) {
  if (candidate && !candidate.startsWith("/private/tmp/")) {
    throw new Error("Rendered recovery SQL and metadata must stay under /private/tmp");
  }
}

const allowedCohorts = ["l3top", "l3", "l2", "l1"];
const selectedCohorts = new Set(
  String(options.cohorts || allowedCohorts.join(",")).split(",").filter(Boolean)
);
if (
  !selectedCohorts.size
  || [...selectedCohorts].some((cohort) => !allowedCohorts.includes(cohort))
) {
  throw new Error(`Invalid cohort selection: ${[...selectedCohorts].join(",")}`);
}

const membershipText = fs.readFileSync(path.resolve(membershipPath), "utf8");
const memberships = parseCsv(membershipText);
if (!memberships.length) throw new Error("Cohort membership export is empty");
const membershipKeys = memberships.map((row) => `${row.cohort}|${row.user_id}`).sort();
if (new Set(membershipKeys).size !== membershipKeys.length) {
  throw new Error("Duplicate cohort/user membership key");
}
for (const row of memberships) {
  if (!allowedCohorts.includes(row.cohort)) throw new Error(`Unexpected cohort ${row.cohort}`);
  const userId = Number(row.user_id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error(`Invalid user_id ${row.user_id}`);
  }
}

const selectedMemberships = memberships.filter((row) => selectedCohorts.has(row.cohort));
if (!selectedMemberships.length) throw new Error("Selected cohort membership is empty");
const selectedMembershipKeys = selectedMemberships
  .map((row) => `${row.cohort}|${row.user_id}`)
  .sort();
const allSelectedUserIds = [...new Set(selectedMemberships.map((row) => Number(row.user_id)))]
  .sort((left, right) => left - right);
const shardStart = Math.floor(allSelectedUserIds.length * userShardIndex / userShardCount);
const shardEnd = Math.floor(allSelectedUserIds.length * (userShardIndex + 1) / userShardCount);
const shardUserIds = allSelectedUserIds.slice(shardStart, shardEnd);
if (!shardUserIds.length) {
  throw new Error(`Empty user shard ${userShardIndex}/${userShardCount}`);
}
const shardUserSet = new Set(shardUserIds);
const shardMemberships = selectedMemberships.filter((row) => (
  shardUserSet.has(Number(row.user_id))
));
const membershipTuples = shardMemberships.map((row) => (
  `('${row.cohort}', ${Number(row.user_id)})`
));
const cohortCounts = Object.fromEntries([...selectedCohorts].map((cohort) => [
  cohort,
  selectedMemberships.filter((row) => row.cohort === cohort).length,
]));
const cohortCountTuples = [...selectedCohorts].map((cohort) => (
  `('${cohort}', ${cohortCounts[cohort]})`
));

const parserGrammars = {
  iPoker: {
    format: "xml-pocket-suit-first",
    node: "<cards ... type=\"Pocket\">",
    heroRule: "player attribute exactly equals source nickname",
    tokenRegex: "(?i)[CDHS](?:10|[2-9TJQKA])",
  },
  text: {
    networks: [
      "888Poker",
      "Chico",
      "GGNetwork",
      "PokerPlanets",
      "PokerStars",
      "PokerStars(FR-ES-PT)",
      "Winamax.fr",
      "WPN",
    ],
    format: "unique-distinct-cardful-dealt-to-rank-first",
    lineRegex: "(?im)^Dealt to\\s+[^\\r\\n]*\\[[^\\]]+\\][^\\r\\n]*$",
    duplicateRule: "collapse byte-identical card-bearing lines before uniqueness gate",
    heroRule: "exact source nickname or literal Hero alias",
    payloadRegex: "(?i)\\[([^\\]]+)\\]",
    tokenRegex: "(?i)(?:10|[2-9TJQKA])[cdhs]",
  },
};
const template = fs.readFileSync(
  path.join(here, "q_ff_rfi_missing_cards_recovery.sql"),
  "utf8"
);
const rawLookupCardScope = mode === "validation"
  ? "1 = 1 /* validation-only overlap includes tracker-known classes */"
  : "structured_hand_class = '' /* strict disjoint recovery predicate */";
const finalQuery = mode === "full-cube"
  ? fullCubeQuery()
  : mode === "recovery-counters"
    ? recoveryCountersQuery()
    : validationQuery();

const startMonth = `${from.slice(0, 7)}-01`;
const toIsMonthStart = to.endsWith("-01");
const endMonthExclusiveDate = toIsMonthStart
  ? toDate
  : new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() + 1, 1));
const through = new Date(toDate.getTime() - 86400000).toISOString().slice(0, 10);
const rendered = template
  .replace("{{COHORT_MEMBERSHIP_TUPLES}}", membershipTuples.join(", "))
  .replace("{{COHORT_COUNT_TUPLES}}", cohortCountTuples.join(", "))
  .replace("{{FINAL_QUERY}}", finalQuery)
  .replaceAll("{{UNIQUE_USER_IDS}}", shardUserIds.join(", "))
  .replaceAll("{{WINDOW_START_INCLUSIVE}}", from)
  .replaceAll("{{WINDOW_END_EXCLUSIVE}}", to)
  .replaceAll("{{WINDOW_THROUGH}}", through)
  .replaceAll("{{WINDOW_START_MONTH}}", startMonth)
  .replaceAll("{{WINDOW_END_MONTH_EXCLUSIVE}}", endMonthExclusiveDate.toISOString().slice(0, 10))
  .replace("{{RAW_LOOKUP_CARD_SCOPE}}", rawLookupCardScope);
if (rendered.includes("{{")) throw new Error("Unresolved recovery query placeholder");

const outputColumns = mode === "full-cube"
  ? fullCubeColumns()
  : mode === "recovery-counters"
    ? [
      "network",
      "tracker_rows",
      "structured_known",
      "structured_missing",
      "missing_raw_joined",
      "tracker_missing_recovered",
      "effective_known",
      "unresolved_missing",
    ]
    : [
      "network",
      "tracker_rows",
      "tracker_known_with_raw",
      "raw_hh_joined",
      "parser_success",
      "class_matches",
      "class_failures",
      "match_pct_tracker_known",
      "tracker_missing_recovered",
      "validation_passed",
    ];
const metadata = {
  schema: "ff-rfi-missing-card-recovery-render-v1",
  mode,
  templateSha256: sha256(template),
  renderedSqlSha256: sha256(rendered),
  structuredSourceTable: "analytics.int_tracker_hand_joined",
  rawSourceTable: "analytics.stg_hh_texts__hh_texts",
  handClassMode: "structured-or-validated-raw-when-empty-v1",
  recoveryPredicate: "latest structured_hand_class = ''",
  recoveryIsDisjoint: true,
  executionPlan: {
    structuredKnownPath: "positioned_latest -> structured_known",
    rawRecoveryPath:
      "positioned_latest blank class -> exact-key raw lookup -> validated parser -> recovered_missing",
    effectiveKnownPath: "structured_known UNION ALL recovered_missing",
    coveragePath: "all positioned_latest eligibility LEFT JOIN effective_known known-card counts",
    rawTextTouchesStructuredKnownRows: mode === "validation",
  },
  rawJoin: {
    type: "exact-key",
    trackerKey: ["toUInt64(user_id)", "toString(network)", "toString(hh_id)"],
    rawKey: [
      "toUInt64(check_user_id)",
      "toString(network)",
      "toString(converted_hh_id)",
    ],
  },
  parserNetworks: [
    "888Poker",
    "Chico",
    "GGNetwork",
    "PokerPlanets",
    "PokerStars",
    "PokerStars(FR-ES-PT)",
    "Winamax.fr",
    "WPN",
    "iPoker",
  ],
  parserGrammars,
  parserGrammarsSha256: sha256(stableJson(parserGrammars)),
  actionPositionStackSource: "latest analytics.int_tracker_hand_joined exact-7 unopened rows",
  outputContainsRawHandsNicknamesOrIds: false,
  outputColumns,
  counters: {
    rendererMode: "recovery-counters",
    fields: [
      "structured_missing",
      "missing_raw_joined",
      "tracker_missing_recovered",
      "unresolved_missing",
    ],
  },
  validation: {
    rendererMode: "validation",
    fixedWindow: validationWindow,
    gate: "class_matches = tracker_known_with_raw and tracker_known_with_raw > 0",
    reports: ["match_pct_tracker_known", "tracker_missing_recovered"],
  },
  membershipSha256: sha256(membershipText),
  membershipKeysSha256: sha256(membershipKeys.join("\n")),
  selectedMembershipKeysSha256: sha256(selectedMembershipKeys.join("\n")),
  membershipCohortCounts: Object.fromEntries(allowedCohorts.map((cohort) => [
    cohort,
    memberships.filter((row) => row.cohort === cohort).length,
  ])),
  selectedCohorts: [...selectedCohorts],
  selectedCohortCounts: cohortCounts,
  sourceMembershipRows: memberships.length,
  selectedMembershipRows: selectedMemberships.length,
  selectedUniqueUsers: allSelectedUserIds.length,
  shardMembershipRows: shardMemberships.length,
  shardUsers: shardUserIds.length,
  userShard: {
    index: userShardIndex,
    count: userShardCount,
    userIdsSha256: sha256(shardUserIds.join(",")),
  },
  window: [from, to],
  windowEndInclusive: through,
};

if (metadataOutput) {
  fs.writeFileSync(metadataOutput, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
} else {
  process.stderr.write(`${JSON.stringify(metadata)}\n`);
}
if (output) {
  fs.writeFileSync(output, rendered, { mode: 0o600 });
  process.stdout.write(`${output}\n`);
} else {
  process.stdout.write(rendered);
}

function fullCubeQuery() {
  return `SELECT
  toString(toDate('{{WINDOW_START_INCLUSIVE}}')) AS window_start,
  toString(toDate('{{WINDOW_THROUGH}}')) AS window_end,
  'cnt_players = 7' AS table_filter,
  toUInt8(7) AS table_size,
  c.cohort AS cohort,
  any(mc.cohort_selected_players) AS cohort_selected_players,
  c.position_group AS position_group,
  c.position_order AS position_order,
  c.pos AS position_code,
  c.stack_bucket AS stack_bucket,
  c.stack_order AS stack_order,
  c.hand_class AS hand_class,
  any(sc.eligible_opportunities) AS eligible_opportunities,
  any(sc.known_card_opportunities) AS known_card_opportunities,
  any(sc.lookup_mismatch_opportunities) AS lookup_mismatch_opportunities,
  toString(any(sc.first_observed_at)) AS first_observed_at,
  toString(any(sc.last_observed_at)) AS last_observed_at,
  count() AS opportunities,
  countIf(action_class IN ('raise', 'shove')) AS raises_total,
  countIf(action_class = 'raise') AS regular_raise,
  countIf(action_class = 'shove') AS open_shove,
  countIf(action_class = 'limp') AS limp,
  countIf(action_class IN ('fold', 'other')) AS fold_other,
  countIf(action_class = 'shove' AND allin = 1) AS shove_allin_flag,
  countIf(
    action_class = 'shove'
    AND allin = 0
    AND isNotNull(raise_and_blind_bb)
    AND raise_and_blind_bb - posted_blind_bb >= stackbb - 0.01
  ) AS shove_effective_amount_only,
  countIf(
    action_class = 'raise'
    AND isNotNull(raise_and_blind_bb)
    AND raise_and_blind_bb - posted_blind_bb BETWEEN 2.5 AND 3.5
    AND stackbb > raise_and_blind_bb - posted_blind_bb + 0.01
  ) AS regular_three_bb_open,
  countIf(
    action_class = 'shove'
    AND allin = 0
    AND isNotNull(raise_and_blind_bb)
    AND raise_and_blind_bb - posted_blind_bb BETWEEN 2.5 AND 3.5
    AND stackbb > raise_and_blind_bb - posted_blind_bb + 0.01
  ) AS normal_three_bb_as_shove,
  countIf(
    preflop_actions != 'R'
    AND startsWith(preflop_actions, 'R')
    AND (
      allin = 1 OR (
        isNotNull(raise_and_blind_bb)
        AND raise_and_blind_bb - posted_blind_bb >= stackbb - 0.01
      )
    )
  ) AS non_exact_r_effective_allin,
  round(100.0 * countIf(action_class IN ('raise', 'shove')) / count(), 3) AS raise_total_pct,
  round(100.0 * countIf(action_class = 'raise') / count(), 3) AS regular_raise_pct,
  round(100.0 * countIf(action_class = 'shove') / count(), 3) AS open_shove_pct,
  round(100.0 * countIf(action_class = 'limp') / count(), 3) AS limp_pct,
  round(100.0 * countIf(action_class IN ('fold', 'other')) / count(), 3) AS fold_pct,
  toUInt8(count() < 50) AS below_exact_minimum,
  toUInt8(count() < 100) AS low_sample
FROM actions AS c
INNER JOIN membership_counts AS mc ON c.cohort = mc.cohort
INNER JOIN state_coverage AS sc
  ON c.cohort = sc.cohort
 AND c.position_group = sc.position_group
 AND c.position_order = sc.position_order
 AND c.pos = sc.position_code
 AND c.stack_bucket = sc.stack_bucket
 AND c.stack_order = sc.stack_order
GROUP BY
  c.cohort,
  c.position_group,
  c.position_order,
  position_code,
  c.stack_bucket,
  c.stack_order,
  c.hand_class
ORDER BY c.cohort, stack_order, position_order, hand_class;`;
}

function recoveryCountersQuery() {
  return `SELECT
  t.network,
  t.tracker_rows,
  t.structured_known,
  t.structured_missing,
  ifNull(r.missing_raw_joined, 0) AS missing_raw_joined,
  ifNull(r.tracker_missing_recovered, 0) AS tracker_missing_recovered,
  t.structured_known + ifNull(r.tracker_missing_recovered, 0) AS effective_known,
  t.structured_missing - ifNull(r.tracker_missing_recovered, 0) AS unresolved_missing
FROM (
  SELECT
    network,
    count() AS tracker_rows,
    countIf(structured_hand_class != '') AS structured_known,
    countIf(structured_hand_class = '') AS structured_missing
  FROM positioned_latest
  GROUP BY network
) AS t
LEFT JOIN (
  SELECT
    network,
    count() AS missing_raw_joined,
    countIf(validated_raw_hand_class != '') AS tracker_missing_recovered
  FROM parsed
  WHERE structured_hand_class = ''
  GROUP BY network
) AS r USING (network)
ORDER BY network;`;
}

function validationQuery() {
  return `SELECT
  t.network,
  t.tracker_rows,
  p.tracker_known_with_raw,
  p.raw_hh_joined,
  p.parser_success,
  p.class_matches,
  p.tracker_known_with_raw - p.class_matches AS class_failures,
  round(
    100.0 * p.class_matches / nullIf(p.tracker_known_with_raw, 0),
    4
  ) AS match_pct_tracker_known,
  p.tracker_missing_recovered,
  if(
    p.tracker_known_with_raw > 0
      AND p.class_matches = p.tracker_known_with_raw,
    toUInt8(1),
    throwIf(1, 'raw hand-class overlap gate failed')
  ) AS validation_passed
FROM (
  SELECT
    network,
    count() AS tracker_rows
  FROM positioned_latest
  WHERE network IN (
    'GGNetwork',
    'PokerStars',
    'PokerStars(FR-ES-PT)',
    'iPoker',
    '888Poker',
    'Chico',
    'PokerPlanets',
    'Winamax.fr',
    'WPN'
  )
  GROUP BY network
) AS t
INNER JOIN (
  SELECT
    network,
    countIf(structured_hand_class != '') AS tracker_known_with_raw,
    count() AS raw_hh_joined,
    countIf(validated_raw_hand_class != '') AS parser_success,
    countIf(
      structured_hand_class != ''
      AND validated_raw_hand_class = structured_hand_class
    ) AS class_matches,
    countIf(
      structured_hand_class = ''
      AND validated_raw_hand_class != ''
    ) AS tracker_missing_recovered
  FROM parsed
  GROUP BY network
) AS p USING (network)
ORDER BY network;`;
}

function fullCubeColumns() {
  return [
    "window_start",
    "window_end",
    "table_filter",
    "table_size",
    "cohort",
    "cohort_selected_players",
    "position_group",
    "position_order",
    "position_code",
    "stack_bucket",
    "stack_order",
    "hand_class",
    "eligible_opportunities",
    "known_card_opportunities",
    "lookup_mismatch_opportunities",
    "first_observed_at",
    "last_observed_at",
    "opportunities",
    "raises_total",
    "regular_raise",
    "open_shove",
    "limp",
    "fold_other",
    "shove_allin_flag",
    "shove_effective_amount_only",
    "regular_three_bb_open",
    "normal_three_bb_as_shove",
    "non_exact_r_effective_allin",
    "raise_total_pct",
    "regular_raise_pct",
    "open_shove_pct",
    "limp_pct",
    "fold_pct",
    "below_exact_minimum",
    "low_sample",
  ];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const header = rows.shift();
  if (!header || !header.includes("cohort") || !header.includes("user_id")) {
    throw new Error("Membership CSV must contain cohort and user_id columns");
  }
  return rows.filter((values) => values.some(Boolean)).map((values) => (
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]))
  ));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
