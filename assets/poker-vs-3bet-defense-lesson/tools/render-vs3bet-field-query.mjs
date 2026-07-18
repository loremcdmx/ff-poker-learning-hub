#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(toolDirectory, 'vs3bet-field-cube.sql');
const rankPath = process.argv[2];
if (!rankPath) throw new Error('Usage: node render-vs3bet-field-query.mjs <external-rank-intervals.csv>');
const outputArgumentIndex = process.argv.indexOf('--output');
const outputPath = outputArgumentIndex >= 0 ? process.argv[outputArgumentIndex + 1] : null;
if (outputArgumentIndex >= 0 && !outputPath) throw new Error('--output requires a file path');

const rankText = fs.readFileSync(rankPath, 'utf8').trimEnd();
const [header, ...lines] = rankText.split(/\r?\n/);
assert.equal(header, 'user_id,rang,rank_start_at,rank_end_at');

const tuples = lines.map((line, index) => {
  const [userId, rank, startAt, endAt] = line.split(',');
  assert(/^\d+$/.test(userId), `bad user_id on rank row ${index + 2}`);
  assert(/^\d+$/.test(rank), `bad rank on rank row ${index + 2}`);
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(startAt), `bad start on rank row ${index + 2}`);
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(endAt), `bad end on rank row ${index + 2}`);
  return `(${userId},${rank},'${startAt}','${endAt}')`;
});

const source = fs.readFileSync(sqlPath, 'utf8');
const clickhouseMarker = '-- 2. ClickHouse: lossless action-count cube.';
const clickhouseStart = source.indexOf(clickhouseMarker);
assert(clickhouseStart >= 0, 'ClickHouse marker missing');
const query = source.slice(clickhouseStart + clickhouseMarker.length).trim()
  .replace('{{RANK_INTERVAL_ROWS}}', tuples.join(',\n    '));
assert(!query.includes('{{RANK_INTERVAL_ROWS}}'), 'rank placeholder was not replaced');
if (outputPath) fs.writeFileSync(outputPath, `${query}\n`);
else process.stdout.write(`${query}\n`);
