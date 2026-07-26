import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredRoutes = [
  "rfi-open-position-lesson.html",
  "bb-call-defense-lesson.html",
  "resteal-lesson.html",
  "flop-cbet-hu-lesson.html",
  "flop-checkraise-lesson.html",
  "vs-3bet-defense-lesson.html",
];
const optionalRoutes = [
  "vs-one-raiser-positions-lesson.html",
  "vs-one-raiser-sb-lesson.html",
  "sb-unopened-lesson.html",
];
const routes = [
  ...requiredRoutes,
  ...optionalRoutes.filter((route) => existsSync(resolve(root, route))),
];

for (const route of routes) {
  const html = readFileSync(resolve(root, route), "utf8");
  const links = html.match(/assets\/poker-kit\/chart-system\.css\?v=[^"']+/g) || [];
  assert.equal(links.length, 1, `${route} loads the shared chart system exactly once`);
}

const chartSystem = readFileSync(resolve(root, "assets/poker-kit/chart-system.css"), "utf8");
const rfiCss = readFileSync(resolve(root, "assets/poker-rfi-open-lesson/lesson.css"), "utf8");
for (const token of [
  "--ff-chart-fold",
  "--ff-chart-call",
  "--ff-chart-raise",
  "--ff-chart-shove",
  "--ff-chart-focus",
  "--ff-chart-fold-solid",
  "--ff-chart-on-fold-solid",
  "--ff-chart-call-solid",
  "--ff-chart-on-call-solid",
  "--ff-chart-raise-solid",
  "--ff-chart-on-raise-solid",
  "--ff-chart-shove-solid",
  "--ff-chart-on-shove-solid",
  "--ff-chart-mix-solid",
  "--ff-chart-on-mix-solid",
]) {
  assert(chartSystem.includes(token), `shared chart system exposes ${token}`);
}

for (const selector of [
  ".field-cell.is-dominant-raise",
  ".field-cell.is-dominant-shove",
  ".field-cell.is-dominant-limp",
  ".field-cell.is-dominant-fold",
  ".field-cell.is-unavailable",
]) {
  assert(chartSystem.includes(selector), `RFI full-cell adapter covers ${selector}`);
}

assert(!/data-sample-state="low"\]\)\s*\{[^}]*opacity\s*:/s.test(chartSystem), "low-sample state never dims its label");
assert(!/data-sample-state="unavailable"\]\)\s*\{[^}]*opacity\s*:/s.test(chartSystem), "unavailable state never dims its label");

const solidPairs = ["fold", "call", "raise", "shove", "mix"];
const cssHex = (name) => {
  const match = chartSystem.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert(match, `shared chart system exposes a hex value for ${name}`);
  return match[1];
};
const luminance = (hex) => {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  return channels.reduce((total, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return total + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
};
const contrast = (left, right) => {
  const [lighter, darker] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};
for (const action of solidPairs) {
  const ratio = contrast(cssHex(`--ff-chart-${action}-solid`), cssHex(`--ff-chart-on-${action}-solid`));
  assert(ratio >= 4.5, `${action} full-cell surface keeps text contrast >= 4.5 (actual ${ratio.toFixed(2)})`);
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

assert.match(rfiCss, /--chart-open:var\(--ff-chart-raise\)/, "RFI open-range cells use semantic raise pink");
assert.match(rfiCss, /--rfi-raise:var\(--ff-chart-raise\)/, "RFI empirical raise cells use semantic raise pink");
assert.match(rfiCss, /--rfi-shove:var\(--ff-chart-shove\)/, "RFI empirical shove cells use semantic shove amber");
assert.doesNotMatch(rfiCss, /--(?:chart-open|rfi-raise):#ffdf51/, "RFI action colors cannot reuse yellow filter focus");

console.log(`chart system contract: ok · ${routes.length} trainer routes`);
