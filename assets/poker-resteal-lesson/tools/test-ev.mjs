import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../engine.js", import.meta.url), "utf8");
const context = { globalThis: {} };
runInNewContext(source, context);
const engine = context.globalThis.PokerRestealEngine;

assert.ok(engine, "engine exports into globalThis");
assert.equal(engine.combosLeft("AA", "AKo"), 3);
assert.equal(engine.combosLeft("AA", "KK"), 6);
assert.equal(engine.combosLeft("AKs", "AA"), 2);
assert.equal(engine.combosLeft("AKo", "AA"), 6);
assert.equal(engine.combosLeft("AKs", "QJo"), 4);
assert.equal(engine.combosLeft("AKo", "KQo"), 9);
assert.equal(engine.totalCombos("22"), 6);
assert.equal(engine.totalCombos("A5s"), 4);
assert.equal(engine.totalCombos("KQo"), 12);

const ev = engine.jamEv({ stack: 40, openSize: 2, ante: 0, foldEquity: 0.85, equity: 0.35 });
assert.ok(Math.abs(ev - 1.35125) < 0.01, `expected +1.35bb, got ${ev}`);

const equityData = JSON.parse(readFileSync(new URL("../data/equity169.json", import.meta.url), "utf8"));
assert.equal(equityData.hands.length, 169);
assert.equal(equityData.equity.length, 169);
equityData.equity.forEach((row, index) => assert.equal(row[index], 0.5));

console.log("PASS resteal engine: combo removal, +1.35bb EV, equity diagonal");
