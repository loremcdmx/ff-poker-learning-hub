import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cssAsset = "assets/poker-kit/lesson-header.css";
const jsAsset = "assets/poker-kit/lesson-header.js";
const css = readFileSync(join(root, cssAsset), "utf8");
const js = readFileSync(join(root, jsAsset), "utf8");
const hash = (source) => createHash("sha256").update(source.replace(/\r\n/g, "\n").replace(/\r/g, "\n")).digest("hex").slice(0, 12);
const cssRef = `${cssAsset}?v=${hash(css)}`;
const jsRef = `${jsAsset}?v=${hash(js)}`;
const lessonPages = readdirSync(root).filter((name) => /-lesson\.html$/.test(name)).sort();
const requiredLessonPages = [
  "bb-call-defense-lesson.html",
  "flop-cbet-hu-lesson.html",
  "flop-checkraise-lesson.html",
  "resteal-lesson.html",
  "rfi-open-position-lesson.html",
  "vs-3bet-defense-lesson.html",
];

for (const page of requiredLessonPages) {
  assert(lessonPages.includes(page), `lesson header contract includes ${page}`);
}
assert(lessonPages.length >= requiredLessonPages.length, "lesson header contract discovers every standalone lesson");
assert.match(css, /grid-template-columns:\s*repeat\(var\(--lesson-step-count\),\s*minmax\(0,\s*1fr\)\)/, "desktop steps use one count-aware row");
assert.match(css, /@media \(max-width: 860px\)[\s\S]*?overflow-x:\s*auto/, "narrow steps use an internal horizontal rail");
assert.match(css, /@media \(max-width: 860px\)[\s\S]*?flex-wrap:\s*nowrap/, "narrow steps cannot inherit route-level wrapping");
assert.match(css, /\.lesson-chrome__back[\s\S]*?min-height:\s*44px/, "back control keeps a 44px target");
assert.match(css, /\.lesson-chrome__steps \.step-tab[\s\S]*?min-height:\s*46px/, "step controls keep at least a 44px target");
assert.match(css, /:focus-visible/, "shared header has a visible keyboard focus state");
assert.match(css, /body\.practice-is-running \[data-lesson-header\]\.lesson-chrome\s*\{[^}]*display:\s*none/s, "full-viewport practice cannot lose height to the lesson header");
assert.match(js, /--lesson-step-count/, "shared runtime derives the grid from the real tab count");
assert.match(js, /MutationObserver/, "shared runtime observes programmatic active-step changes");
assert.match(js, /nav\.scrollTo/, "shared runtime reveals an off-screen active step");
assert.match(js, /tab\.tabIndex = tab === selected \? 0 : -1/, "shared runtime owns roving tab stops");
assert.match(js, /event\.key === "ArrowRight"[\s\S]*?event\.key === "End"/, "shared runtime owns tab-list keyboard navigation");

for (const page of lessonPages) {
  const html = readFileSync(join(root, page), "utf8");
  assert.equal((html.match(/data-lesson-header/g) || []).length, 1, `${page} has one canonical lesson header`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page} keeps one document title`);
  assert(html.includes(`href="${cssRef}"`), `${page} loads the current shared header CSS`);
  assert(html.includes(`src="${jsRef}"`), `${page} loads the current shared header runtime`);
  const stylesheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((match) => match[0]);
  assert(stylesheets.at(-1)?.includes(cssRef), `${page} loads shared header CSS after route styles`);

  const header = html.match(/<header\b[^>]*data-lesson-header[^>]*>[\s\S]*?<\/header>/)?.[0] || "";
  assert.match(header, /class="[^"]*\blesson-chrome\b[^"]*"/, `${page} uses the shared lesson-chrome surface`);
  assert.match(header, /class="[^"]*\blesson-chrome__identity\b[^"]*"/, `${page} uses the shared identity layout`);
  assert.match(header, /class="[^"]*\blesson-chrome__copy\b[^"]*"/, `${page} uses the shared title stack`);
  assert.match(header, /<a\b[^>]*class="[^"]*\blesson-chrome__back\b[^"]*"[^>]*href="\/"|<a\b[^>]*href="\/"[^>]*class="[^"]*\blesson-chrome__back\b/, `${page} has a shared back control`);
  assert.match(header, /class="[^"]*\blesson-chrome__eyebrow\b[^"]*"/, `${page} has a lesson kicker`);
  assert.match(header, /<h1\b[^>]*class="[^"]*\blesson-chrome__title\b[^"]*"[^>]*>[^<]+<\/h1>/, `${page} names the lesson in the header`);

  const nav = header.match(/<nav\b[^>]*class="[^"]*\blesson-chrome__steps\b[^"]*"[^>]*>[\s\S]*?<\/nav>/)?.[0]
    || header.match(/<nav\b[^>]*role="tablist"[^>]*class="[^"]*\blesson-chrome__steps\b[^"]*"[^>]*>[\s\S]*?<\/nav>/)?.[0]
    || "";
  assert(nav, `${page} has the shared step rail`);
  assert.match(nav, /role="tablist"/, `${page} exposes the steps as a tablist`);
  assert.match(nav, /aria-label="Шаги урока"/, `${page} labels the step rail`);
  const tabs = [...nav.matchAll(/<button\b[^>]*class="[^"]*\bstep-tab\b[^"]*"[^>]*>/g)].map((match) => match[0]);
  assert(tabs.length >= 4 && tabs.length <= 7, `${page} exposes 4–7 lesson steps`);
  assert.equal(tabs.filter((tab) => tab.includes('aria-selected="true"')).length, 1, `${page} starts with one selected step`);
  for (const tab of tabs) {
    assert.match(tab, /type="button"/, `${page} step is an explicit button`);
    assert.match(tab, /role="tab"/, `${page} step has tab semantics`);
    assert.match(tab, /aria-selected="(?:true|false)"/, `${page} step exposes selection state`);
  }
}

console.log(`✓ shared lesson header contract passed for ${lessonPages.length} lessons`);
