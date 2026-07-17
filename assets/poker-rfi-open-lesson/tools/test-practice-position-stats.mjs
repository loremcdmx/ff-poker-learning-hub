import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const statsSource=fs.readFileSync(path.join(root,"practice-stats.js"),"utf8");
const context={window:{}};
vm.runInNewContext(statsSource,context);
const P=context.window.PokerRfiPracticeStats;

assert.ok(P);
assert.deepEqual(Array.from(P.POSITIONS),["EP","MP","HJ","CO","BTN"]);
const stats=P.create();
assert.equal(P.record(stats,{position:"EP",hand:"AA",chosen:"fold",expected:"open"}),false);
assert.equal(P.record(stats,{position:"EP",hand:"K6s",chosen:"open",expected:"fold"}),false);
assert.equal(P.record(stats,{position:"EP",hand:"KK",chosen:"open",expected:"open"}),true);
assert.equal(P.record(stats,{position:"EP",hand:"72o",chosen:"limp",expected:"fold"}),false);
assert.equal(P.record(stats,{position:"MP",hand:"72o",chosen:"fold",expected:"fold"}),true);
assert.deepEqual(JSON.parse(JSON.stringify(P.summary(stats,"EP"))),{attempts:4,correct:1,accuracy:25,extraOpens:1,missedOpens:1,otherMistakes:1});
assert.deepEqual(JSON.parse(JSON.stringify(P.summary(stats,"MP"))),{attempts:1,correct:1,accuracy:100,extraOpens:0,missedOpens:0,otherMistakes:0});
assert.equal(P.hand(stats,"EP","AA").missedOpens,1);
assert.equal(P.hand(stats,"EP","K6s").extraOpens,1);
assert.equal(P.hand(stats,"EP","72o").otherMistakes,1);
P.record(stats,{position:"EP",hand:"AA",chosen:"fold",expected:"open"});
assert.equal(P.hand(stats,"EP","AA").missedOpens,2);
assert.equal(P.summary(stats,"EP").attempts,5);

const html=fs.readFileSync(path.resolve(root,"../../rfi-open-position-lesson.html"),"utf8");
const lessonSource=fs.readFileSync(path.join(root,"lesson.js"),"utf8");
const css=fs.readFileSync(path.join(root,"lesson.css"),"utf8");
for(const token of ['id="practicePositionInsights"','id="practicePositionSummary"','id="practicePositionChart"'])assert.ok(html.includes(token),token);
assert.ok(html.indexOf("practice-stats.js")<html.indexOf("lesson.js"));
const hash=createHash("sha256").update(statsSource).digest("hex").slice(0,12);
assert.ok(html.includes(`practice-stats.js?v=${hash}`),"practice-stats cache token");
for(const token of ["practiceStats:P.create()","P.record(state.practiceStats","function renderPracticePositionSummary","function renderPracticePositionChart","pointerover","focusin","pointerleave","Escape"])assert.ok(lessonSource.includes(token),token);
assert.equal((lessonSource.match(/P\.record\(state\.practiceStats/g)||[]).length,1,"each answer has one position-stats write path");
assert.ok(!lessonSource.slice(lessonSource.indexOf("function advancePractice"),lessonSource.indexOf("function showPracticeModes")).includes("P.create()"),"advancing and rebuilding the infinite queue keeps position stats");
for(const selector of [".practice-position-summary",".practice-position-stat",".practice-position-chart[hidden]",".practice-position-cell.is-extra-open",".practice-position-cell.is-missed-open"])assert.ok(css.includes(selector),selector);
assert.match(css,/\.practice-position-chart\{[^}]*width:min\(100%,560px\)/,"expanded chart stays a compact inspector");
assert.match(css,/\.practice-position-grid\{[^}]*max-width:250px/,"desktop error matrix stays compact enough to keep the table visible");
assert.match(css,/@media \(max-width:620px\)\{[\s\S]*?\.practice-position-grid\{max-width:200px\}/,"mobile error matrix leaves room for revealed opponent cards");

console.log("RFI practice position stats: ok");
