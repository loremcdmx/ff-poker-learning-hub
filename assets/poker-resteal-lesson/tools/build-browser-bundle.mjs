import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const files = [
  "equity169.json",
  "rank_vs_random169.json",
  "field_opens.json",
  "field_vs_jam.json",
  "field_call_range.json",
  "hero_outcomes.json",
  "hero_bustouts.json",
  "cleanup_waterfall.json"
];
const bundle = Object.fromEntries(files.map((name) => [name.replace(".json", ""), JSON.parse(readFileSync(join(root, name), "utf8"))]));
const source = `(function(){"use strict";window.PokerRestealBundle=Object.freeze(${JSON.stringify(bundle)});})();\n`;
writeFileSync(join(root, "browser-bundle.js"), source);
console.log(`PASS resteal browser bundle: ${files.length} datasets, ${Buffer.byteLength(source)} bytes`);
