#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const requested = process.argv.slice(2).filter((value) => value !== "--check");
const JS_MANIFESTS = [
  "assets/poker-simulator/simulator-feature-loader.js",
  "assets/poker-simulator/simulator-practice-packs.js"
];

if (!requested.length) {
  console.error("Usage: node scripts/cache-bust.mjs [--check] <asset.css|asset.js> [...]");
  process.exit(2);
}

function normalizedContent(file) {
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function contentHash(file) {
  return createHash("sha256").update(normalizedContent(file)).digest("hex").slice(0, 12);
}

function htmlFiles() {
  return readdirSync(ROOT)
    .filter((name) => name.endsWith(".html"))
    .map((name) => join(ROOT, name));
}

function normalizeAsset(value) {
  const absolute = resolve(ROOT, String(value || "").replace(/^\/+/, ""));
  if (!absolute.startsWith(`${ROOT}/`) || !existsSync(absolute)) {
    throw new Error(`Asset does not exist inside repository: ${value}`);
  }
  const asset = relative(ROOT, absolute).replaceAll("\\", "/");
  if (!/\.(?:css|js)$/.test(asset)) throw new Error(`Unsupported asset type: ${asset}`);
  return { absolute, asset, hash: contentHash(absolute) };
}

const assets = requested.map(normalizeAsset);
const targets = [
  ...htmlFiles(),
  ...JS_MANIFESTS.map((file) => join(ROOT, file)).filter(existsSync)
];
let stale = 0;
let changed = 0;

for (const target of targets) {
  const original = readFileSync(target, "utf8");
  let next = original;
  for (const { asset, hash } of assets) {
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(${escaped}\\?v=)([^\"'&\\s)]+)`, "g");
    next = next.replace(pattern, (match, prefix, token) => {
      if (token === hash) return match;
      stale += 1;
      return `${prefix}${hash}`;
    });
  }
  if (next !== original && !CHECK) {
    writeFileSync(target, next);
    changed += 1;
  }
}

if (CHECK && stale) {
  console.error(`[cache-bust] ${stale} stale reference(s)`);
  process.exit(1);
}

console.log(CHECK
  ? `[cache-bust] ${assets.length} asset(s) current`
  : `[cache-bust] updated ${stale} reference(s) across ${changed} file(s)`);
