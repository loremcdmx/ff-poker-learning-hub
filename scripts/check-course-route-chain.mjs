import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const terminalRoute = "/poker-simulator";
const course = [
  ["/rfi-open-position-lesson", "rfi-open-position-lesson.html", "/sb-unopened-lesson"],
  ["/sb-unopened-lesson", "sb-unopened-lesson.html", "/bb-call-defense-lesson"],
  ["/bb-call-defense-lesson", "bb-call-defense-lesson.html", "/vs-one-raiser-positions-lesson"],
  ["/vs-one-raiser-positions-lesson", "vs-one-raiser-positions-lesson.html", "/vs-one-raiser-sb-lesson"],
  ["/vs-one-raiser-sb-lesson", "vs-one-raiser-sb-lesson.html", "/resteal-lesson"],
  ["/resteal-lesson", "resteal-lesson.html", "/flop-cbet-hu-lesson"],
  ["/flop-cbet-hu-lesson", "flop-cbet-hu-lesson.html", "/flop-checkraise-lesson"],
  ["/flop-checkraise-lesson", "flop-checkraise-lesson.html", "/vs-3bet-defense-lesson"],
  ["/vs-3bet-defense-lesson", "vs-3bet-defense-lesson.html", terminalRoute],
];

const nextByRoute = new Map();
for (const [route, file, expectedNext] of course) {
  const html = readFileSync(resolve(root, file), "utf8");
  const footer = html.match(/<footer\b[^>]*class="[^"]*\blesson-footer\b[^"]*"[^>]*>[\s\S]*?<\/footer>/)?.[0] || "";
  assert(footer, `${file} exposes one standalone lesson footer`);
  const links = Array.from(footer.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g), (match) => ({
    href: match[1],
    label: match[2].replace(/<[^>]+>/g, "").trim(),
  }));
  assert.equal(links.length, 2, `${file} footer has hub and next-course links only`);
  assert.equal(links[0].href, "/", `${file} keeps the standalone hub return`);
  assert.equal(links[1].href, expectedNext, `${file} advances to the next standalone course step`);
  assert.match(links[1].label, /\S/, `${file} next-course link has a visible label`);
  nextByRoute.set(route, links[1].href);
}

const visited = [];
const visitedSet = new Set();
let current = course[0][0];
while (nextByRoute.has(current)) {
  assert(!visitedSet.has(current), `standalone course must not cycle at ${current}`);
  visited.push(current);
  visitedSet.add(current);
  current = nextByRoute.get(current);
}
assert.equal(current, terminalRoute, "lesson 09 hands off to free play in the simulator");
assert.deepEqual(visited, course.map(([route]) => route), "all nine standalone lessons are traversed once without a skip");

const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
const indexLessonRoutes = Array.from(
  indexHtml.matchAll(/<a\b[^>]*class="primary-action"[^>]*href="(\/[^"]+-lesson)"/g),
  (match) => match[1]
);
assert.deepEqual(indexLessonRoutes, course.map(([route]) => route), "hub cards expose the same nine-step lesson order");
assert.match(
  indexHtml,
  /Опен → SB без опена → Защита BB → vs рейз \(позиции\) → vs рейз \(SB\) → Рестил → C-bet → Чек-рейз → Защита на 3-бет → Симулятор/,
  "hub path note names lesson 09 before the simulator"
);

const generatedBenchmarkRoutes = new Map([
  ["vs_raise_free", course.find(([, file]) => file === "vs-one-raiser-positions-lesson.html")[2]],
  ["vs_raise_sb", course.find(([, file]) => file === "vs-one-raiser-sb-lesson.html")[2]],
  ["sb_unopened", course.find(([, file]) => file === "sb-unopened-lesson.html")[2]],
]);
const generatorSource = readFileSync(resolve(root, "assets/poker-preflop-benchmark/tools/build-pages.mjs"), "utf8");
for (const [key, expectedNext] of generatedBenchmarkRoutes) {
  const pageConfig = generatorSource.match(
    new RegExp(`\\{\\s*key: ["']${key}["'][\\s\\S]*?next: ["']([^"']+)["'][\\s\\S]*?nextLabel: ["']([^"']+)["'][\\s\\S]*?\\n\\s*\\}`)
  );
  assert(pageConfig, `benchmark generator exposes ${key} route config`);
  assert.equal(pageConfig[1], expectedNext, `benchmark regeneration preserves ${key} course successor`);
  assert.match(pageConfig[2], /\S/, `benchmark regeneration preserves a visible ${key} footer label`);
}

console.log(`course route chain: ok · ${visited.length} lessons → ${terminalRoute}`);
