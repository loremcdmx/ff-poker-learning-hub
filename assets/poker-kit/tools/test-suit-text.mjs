import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const assets = new URL("../../", import.meta.url);
const context = {};
context.window = context;
context.globalThis = context;

runInNewContext(
  readFileSync(new URL("poker-kit/suit-text.js", assets), "utf8"),
  context,
  { filename: "poker-kit/suit-text.js" }
);

const api = context.PokerSuitText;
assert.ok(api, "shared suit-text API is available");

const sample = "A♣7♦2♠ · T♥9♥";
const parsed = Array.from(api.parts(sample), (part) => ({ ...part }));
assert.equal(parsed.map((part) => part.text).join(""), sample, "decorator preserves visible text");
assert.deepEqual(
  parsed.filter((part) => part.type === "suit").map((part) => part.suit),
  ["c", "d", "s", "h", "h"],
  "all four suit glyphs map to the canonical four-color keys"
);
assert.deepEqual(
  Array.from(api.parts("AKQJT"), (part) => ({ ...part })),
  [{ type: "text", text: "AKQJT" }],
  "rank-only poker text remains untouched"
);

const css = readFileSync(new URL("poker-kit/suit-text.css", assets), "utf8");
for (const suit of ["h", "d", "c", "s"]) {
  assert.match(css, new RegExp(`\\.poker-suit-text--${suit}`), `${suit} owns a text color`);
}

console.log("Poker suit text contract: ok");
