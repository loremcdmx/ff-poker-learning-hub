#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const recorder = path.join(here, "record-full-history-source-execution.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-postflop-execution-"));
const query = path.join(temp, "query.sql");
const template = path.join(temp, "template.sql");
const result = path.join(temp, "result.csv");
const output = path.join(temp, "execution.json");
fs.writeFileSync(query, "SELECT 1;\n");
fs.writeFileSync(template, "SELECT {value:UInt8};\n");
fs.writeFileSync(result, "key,value\none,1\ntwo,\"line 1\nline 2\"\n");

const sha256 = (filePath) =>
  createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const baseArgs = [
  recorder,
  `--query=${query}`,
  `--query-template=${template}`,
  `--result=${result}`,
  `--output=${output}`,
  "--window-start=2023-09-01",
  "--window-end=2026-07-22"
];

const asyncResult = spawnSync(process.execPath, [
  ...baseArgs,
  "--execution-mode=async",
  "--query-job-id=mcp_ch_job_fixture"
], { encoding: "utf8" });
assert.equal(asyncResult.status, 0, asyncResult.stderr);
const asyncMetadata = JSON.parse(fs.readFileSync(output, "utf8"));
assert.equal(asyncMetadata.executionMode, "async");
assert.equal(asyncMetadata.queryJobId, "mcp_ch_job_fixture");
assert.equal(asyncMetadata.querySha256, sha256(query));
assert.equal(asyncMetadata.sourceQueryTemplateSha256, sha256(template));
assert.equal(asyncMetadata.resultSha256, sha256(result));
assert.equal(asyncMetadata.rowCount, 2, "quoted newlines do not create phantom rows");

const syncResult = spawnSync(process.execPath, [
  ...baseArgs,
  "--execution-mode=sync"
], { encoding: "utf8" });
assert.equal(syncResult.status, 0, syncResult.stderr);
const syncMetadata = JSON.parse(fs.readFileSync(output, "utf8"));
assert.equal(syncMetadata.queryJobId, `sync:${sha256(query)}`);

const missingProviderId = spawnSync(process.execPath, [
  ...baseArgs,
  "--execution-mode=async"
], { encoding: "utf8" });
assert.notEqual(missingProviderId.status, 0);
assert.match(missingProviderId.stderr, /provider --query-job-id/);

console.log("full-history source execution recorder: ok");
