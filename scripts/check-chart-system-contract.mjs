import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routes = [
  "rfi-open-position-lesson.html",
  "bb-call-defense-lesson.html",
  "resteal-lesson.html",
  "flop-cbet-hu-lesson.html",
  "flop-checkraise-lesson.html",
  "vs-3bet-defense-lesson.html",
  "vs-one-raiser-positions-lesson.html",
  "vs-one-raiser-sb-lesson.html",
  "sb-unopened-lesson.html",
];

for (const route of routes) {
  const html = readFileSync(resolve(root, route), "utf8");
  const links = html.match(/assets\/poker-kit\/chart-system\.css\?v=[^"']+/g) || [];
  assert.equal(links.length, 1, `${route} loads the shared chart system exactly once`);
}

const chartSystem = readFileSync(resolve(root, "assets/poker-kit/chart-system.css"), "utf8");
for (const token of ["--ff-chart-fold", "--ff-chart-call", "--ff-chart-raise", "--ff-chart-shove", "--ff-chart-focus"]) {
  assert(chartSystem.includes(token), `shared chart system exposes ${token}`);
}
for (const routeClass of [
  ".rfi-open-lesson",
  ".bb-call-lesson",
  ".resteal-lesson",
  ".flop-cbet-hu-lesson",
  ".flop-checkraise-lesson",
  ".vs-3bet-defense-lesson",
  ".preflop-benchmark-lesson",
]) {
  assert(chartSystem.includes(routeClass), `shared chart system adapts ${routeClass}`);
}

console.log(`chart system contract: ok · ${routes.length} trainer routes`);
