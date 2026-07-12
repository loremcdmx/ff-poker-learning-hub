import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "index.html",
  "rfi-open-position-lesson.html",
  "bb-call-defense-lesson.html",
  "resteal-lesson.html",
  "poker-simulator.html"
];
const expectedRoutes = new Map([
  ["/open-raises", "/rfi-open-position-lesson.html"],
  ["/bb-defense", "/bb-call-defense-lesson.html"],
  ["/resteal", "/resteal-lesson.html"]
]);
const requiredDirectories = [
  "assets/poker-kit",
  "assets/poker-simulator",
  "assets/poker-trainer-shell",
  "assets/poker-progress",
  "assets/player-survey",
  "assets/poker-rfi-open-lesson",
  "assets/poker-bb-call-defense-lesson",
  "assets/poker-resteal-lesson"
];

let failures = 0;
function check(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
  } else {
    failures += 1;
    console.error(`✗ ${message}`);
  }
}

for (const page of pages) check(existsSync(join(root, page)), `${page} exists`);
for (const directory of requiredDirectories) check(existsSync(join(root, directory)), `${directory} exists`);

const localRefPattern = /(?:src|href)=["']([^"']+)["']/g;
for (const page of pages) {
  const pagePath = join(root, page);
  if (!existsSync(pagePath)) continue;
  const html = readFileSync(pagePath, "utf8");
  for (const match of html.matchAll(localRefPattern)) {
    const ref = match[1];
    if (/^(?:https?:|data:|mailto:|tel:|#|\/)/.test(ref)) continue;
    const cleanRef = ref.split(/[?#]/, 1)[0];
    if (!cleanRef) continue;
    check(existsSync(resolve(dirname(pagePath), cleanRef)), `${page} resolves ${cleanRef}`);
  }
}

const hub = readFileSync(join(root, "index.html"), "utf8");
check((hub.match(/class="trainer-card /g) || []).length === 3, "hub exposes exactly three trainer cards");
for (const route of expectedRoutes.keys()) check(hub.includes(`href="${route}"`), `hub links to ${route}`);
check(hub.includes("https://github.com/loremcdmx/ff-poker-learning-hub"), "hub includes the public GitHub link");

const vercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const actualRoutes = new Map((vercelConfig.rewrites || []).map(({ source, destination }) => [source, destination]));
for (const [source, destination] of expectedRoutes) {
  check(actualRoutes.get(source) === destination, `Vercel rewrites ${source} to ${destination}`);
  check(existsSync(join(root, destination.slice(1))), `${source} rewrite destination exists`);
}

if (failures) {
  console.error(`\n${failures} static check(s) failed.`);
  process.exit(1);
}

console.log("\nStatic hub contract passed.");
