import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";import vm from "node:vm";import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const source=fs.readFileSync(path.join(root,"data.js"),"utf8");const context={window:{}};vm.runInNewContext(source,context);const D=context.window.PokerRfiData;
assert.ok(D);assert.equal(D.physicalPage,7);assert.deepEqual(Object.keys(D.positions),["EP","MP","HJ","CO","BTN"]);assert.deepEqual(Object.values(D.targets),[20,26,32,47,75]);
for(const position of Object.keys(D.positions)){
 assert.equal(Object.keys(D.frequencies[position]).length,169);
 for(const hand of ["AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s"])assert.equal(D.frequencies[position][hand],100,`${position} ${hand}`);
}
assert.equal(D.frequencies.EP.K7s,80);assert.equal(D.frequencies.EP.A9o,0);assert.equal(D.frequencies.MP.A9o,50);assert.equal(D.frequencies.HJ.K3s,80);assert.equal(D.frequencies.CO.J3s,5);assert.equal(D.frequencies.BTN.Q2o,50);assert.equal(D.frequencies.BTN["72o"],0);
assert.equal(D.spots.length,20);for(const s of D.spots){assert.ok(D.positions[s.position]);assert.match(s.hand,/^[AKQJT98765432]{2}[so]?$/);assert.equal(typeof s.open,"boolean");assert.equal(s.open,D.frequencies[s.position][s.hand]===100);assert.ok(s.reason)}console.log("RFI open lesson contract: ok");
