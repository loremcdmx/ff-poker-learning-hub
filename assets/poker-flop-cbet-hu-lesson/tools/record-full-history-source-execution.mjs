#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const options = {};
for (const argument of process.argv.slice(2)) {
  const match = argument.match(/^--([^=]+)=(.*)$/);
  if (!match) throw new Error(`Expected --key=value, got ${argument}`);
  options[match[1]] = match[2];
}

for (const required of ["query", "query-template", "result", "output", "execution-mode", "window-start", "window-end"]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}
if (!["async", "sync"].includes(options["execution-mode"])) {
  throw new Error("--execution-mode must be async or sync");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(options["window-start"]) || !/^\d{4}-\d{2}-\d{2}$/.test(options["window-end"]) || options["window-start"] >= options["window-end"]) {
  throw new Error("Window must be ordered YYYY-MM-DD boundaries");
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const queryBuffer = fs.readFileSync(path.resolve(options.query));
const queryTemplateBuffer = fs.readFileSync(path.resolve(options["query-template"]));
const resultBuffer = fs.readFileSync(path.resolve(options.result));
const querySha256 = sha256(queryBuffer);
const queryJobId = options["execution-mode"] === "sync"
  ? `sync:${querySha256}`
  : options["query-job-id"];
if (!queryJobId || (options["execution-mode"] === "async" && String(queryJobId).startsWith("sync:"))) {
  throw new Error("Async execution requires the provider --query-job-id");
}

function csvRowCount(text) {
  let rows = 0;
  let quoted = false;
  let hasCell = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      index += 1;
      hasCell = true;
    } else if (char === '"') {
      quoted = !quoted;
      hasCell = true;
    } else if (char === "\n" && !quoted) {
      if (hasCell) rows += 1;
      hasCell = false;
    } else if (char !== "\r") {
      hasCell = true;
    }
  }
  if (quoted) throw new Error("Result CSV has an unterminated quoted field");
  if (hasCell) rows += 1;
  return Math.max(0, rows - 1);
}

const metadata = {
  schemaVersion: 1,
  executionMode: options["execution-mode"],
  queryJobId,
  querySha256,
  sourceQueryTemplateSha256: sha256(queryTemplateBuffer),
  resultSha256: sha256(resultBuffer),
  rowCount: csvRowCount(resultBuffer.toString("utf8")),
  window: {
    startInclusive: options["window-start"],
    endExclusive: options["window-end"]
  }
};
if (metadata.rowCount <= 0) throw new Error("Result CSV is empty");

const outputPath = path.resolve(options.output);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output: outputPath, ...metadata })}\n`);
