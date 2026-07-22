import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:4173";
const routes = [
  "/vs-one-raiser-positions-lesson",
  "/vs-one-raiser-sb-lesson",
  "/sb-unopened-lesson",
].filter((route) => !process.env.SMOKE_ROUTE || route === process.env.SMOKE_ROUTE);
const minimumStackSteps = {
  "/vs-one-raiser-positions-lesson": 8,
  "/vs-one-raiser-sb-lesson": 7,
  "/sb-unopened-lesson": 10,
};
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "polish", width: 1280, height: 800 },
  { name: "comment", width: 1155, height: 870 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "reported", width: 969, height: 907 },
  { name: "split-edge", width: 921, height: 900 },
  { name: "stacked-edge", width: 920, height: 900 },
  { name: "mobile", width: 390, height: 844 },
].filter((viewport) => !process.env.SMOKE_VIEWPORT || viewport.name === process.env.SMOKE_VIEWPORT);
const browser = await chromium.launch({ headless: true });
const results = [];
const reducedMotion = process.env.REDUCED_MOTION === "1" ? "reduce" : "no-preference";
const visualCaptureDir = process.env.VISUAL_CAPTURE_DIR;
if (visualCaptureDir) mkdirSync(visualCaptureDir, { recursive: true });

async function captureState(page, route, viewport, state) {
  if (!visualCaptureDir) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  await page.screenshot({
    path: join(visualCaptureDir, `${route.slice(1)}-${viewport.name}-${state}.png`),
    fullPage: false,
  });
}

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const page = await browser.newPage({ viewport, reducedMotion });
      const errors = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
      await page.goto(`${base}${route}`, { waitUntil: "load" });
      await page.waitForSelector("#introTableHost [data-trainer-simulator-actions]");
      await captureState(page, route, viewport, "deal");
      const introGeometry = await page.evaluate(() => {
        const rect = (selector) => {
          const node = document.querySelector(selector);
          if (!node) return null;
          const box = node.getBoundingClientRect();
          return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
        };
        const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
        const host = rect("#introTableHost");
        const cards = rect("#introTableHost .seat.is-hero .seat-cards");
        const heroBet = rect("#introTableHost .hero-felt-bet");
        const pot = rect("#introTableHost .pot");
        const controls = rect("#introTableHost .client-controls");
        const status = rect("#introTableHost .action-status");
        const card = rect("#introTableHost .seat.is-hero .poker-deck-card");
        const tableCard = rect(".table-card");
        const introPanel = rect(".benchmark-intro");
        const introCopy = rect(".benchmark-intro .intro-copy");
        const introVisual = rect(".benchmark-intro .intro-table-visual");
        const actionBar = rect("#introTableHost .action-bar");
        const visibleFoldBadges = [...document.querySelectorAll("#introTableHost .seat-action-badge.is-fold")]
          .filter((node) => getComputedStyle(node).display !== "none" && node.getBoundingClientRect().width > 0).length;
        const visibleEmptyBadges = [...document.querySelectorAll("#introTableHost .seat-action-badge:empty")]
          .filter((node) => getComputedStyle(node).display !== "none" && node.getBoundingClientRect().width > 0).length;
        const actionColors = [...document.querySelectorAll("#introTableHost [data-option-key]")]
          .map((node) => getComputedStyle(node).backgroundImage + " " + getComputedStyle(node).backgroundColor);
        const seatPanels = [...document.querySelectorAll("#introTableHost .seat-panel")].map((node) => {
          const box = node.getBoundingClientRect();
          return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
        });
        const tableVisuals = [...document.querySelectorAll("#introTableHost .seat-panel, #introTableHost .seat-position, #introTableHost .seat-cards, #introTableHost .dealer-dot")]
          .filter((node) => getComputedStyle(node).display !== "none" && node.getBoundingClientRect().width > 0)
          .map((node) => {
            const box = node.getBoundingClientRect();
            return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
          });
        const contains = (parent, child) => Boolean(parent && child
          && child.left >= parent.left - 1 && child.right <= parent.right + 1
          && child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1);
        return {
          heroBet,
          pot,
          card,
          cards,
          controlsInsideHost: Boolean(host && controls && status && controls.bottom <= host.bottom + 1 && status.bottom <= host.bottom + 1),
          heroBetOverlapsCards: overlaps(heroBet, cards),
          heroBetOverlapsPot: overlaps(heroBet, pot),
          distinctActionColors: new Set(actionColors).size,
          maxSeatHeight: Math.max(...seatPanels.map((seat) => seat.height)),
          maxSeatWidth: Math.max(...seatPanels.map((seat) => seat.width)),
          introPanelHeight: introPanel?.height || 0,
          introIsSplit: Boolean(introCopy && introVisual && introCopy.right <= introVisual.left + 1),
          introUnusedBottom: introPanel && tableCard ? introPanel.bottom - tableCard.bottom : 0,
          tableCardContainsActions: contains(tableCard, actionBar),
          tableCardContainsSeats: seatPanels.every((seat) => contains(tableCard, seat)),
          tableCardContainsVisuals: tableVisuals.every((visual) => contains(tableCard, visual)),
          visibleEmptyBadges,
          visibleFoldBadges,
        };
      });
      const compactLimits = viewport.name === "mobile"
        ? { cardWidth: 54, seatWidth: 86, seatHeight: 40 }
        : { cardWidth: 70, seatWidth: 120, seatHeight: 50 };
      assert(introGeometry.card?.width <= compactLimits.cardWidth, `${route} keeps the Hero cards compact at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert(introGeometry.maxSeatWidth <= compactLimits.seatWidth, `${route} keeps seat panels compact at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert(introGeometry.maxSeatHeight <= compactLimits.seatHeight, `${route} keeps seat panels short at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.heroBetOverlapsCards, false, `${route} keeps the live bet clear of Hero cards at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.heroBetOverlapsPot, false, `${route} keeps the live bet clear of the pot at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.controlsInsideHost, true, `${route} keeps the action dock inside the reserved table gutter at ${viewport.name}`);
      assert.equal(introGeometry.visibleFoldBadges, 0, `${route} removes unlabeled fold dots at ${viewport.name}`);
      assert.equal(introGeometry.visibleEmptyBadges, 0, `${route} removes every unlabeled seat-action dot at ${viewport.name}`);
      assert.equal(introGeometry.distinctActionColors, 4, `${route} gives all four decisions distinct semantic colors at ${viewport.name}`);
      assert.equal(introGeometry.tableCardContainsSeats, true, `${route} keeps every seat panel inside the table card at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.tableCardContainsVisuals, true, `${route} keeps all table labels and cards inside the table card at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.tableCardContainsActions, true, `${route} keeps the action dock inside the table card at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert(introGeometry.introUnusedBottom <= 80, `${route} does not leave a large empty tail inside the intro at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      if (viewport.width >= 921) assert.equal(introGeometry.introIsSplit, true, `${route} keeps the compact split intro at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      if (viewport.name === "reported") assert(introGeometry.introPanelHeight <= 620, `${route} keeps the reported intro compact: ${JSON.stringify(introGeometry)}`);
      if (viewport.name === "reported") assert(introGeometry.introUnusedBottom <= 40, `${route} keeps the reported intro tightly cropped: ${JSON.stringify(introGeometry)}`);
      if (viewport.name === "reported") {
        await page.screenshot({ path: `/private/tmp/${route.slice(1)}-intro-reported.png`, fullPage: false });
        await page.locator("#introTableHost").screenshot({ path: `/private/tmp/${route.slice(1)}-table-reported.png` });
      }
      assert.equal(await page.locator("#introTableHost [data-option-key]").count(), 4, `${route} has four in-table actions`);
      const firstAction = page.locator("#introTableHost [data-option-key]").first();
      await firstAction.click();
      await page.getByRole("tab", { name: "2. Главное" }).click();
      await captureState(page, route, viewport, "main");
      assert.equal(await page.locator("#wisdomSlides .wisdom-rule-card").count(), 3, `${route} has three actionable rules`);
      assert.equal(await page.locator("#wisdomSlides .wisdom-evidence").count(), 3, `${route} supports each rule with a comparison`);
      if (route === "/vs-one-raiser-sb-lesson") {
        const mainWisdom = await page.locator("#wisdomSlides").textContent();
        assert(mainWisdom.includes("Те же 26%, но колл съедает пуш"), "SB default wisdom emphasizes action shape rather than equal continuation");
        assert(mainWisdom.includes("+9 п.п."), "SB default wisdom quantifies the call-for-jam substitution");
        assert(mainWisdom.includes("Та же ширина — другой винрейт"), "SB default wisdom names the outcome difference");
        assert(mainWisdom.includes("−9,8 BB"), "SB default wisdom exposes the exact-spot outcome gap");
        assert(mainWisdom.includes("QJs · 88%"), "SB default wisdom freezes the clearest recent hand-class swap");
        assert(mainWisdom.includes("QJs") && mainWisdom.includes("QTs") && mainWisdom.includes("KTs") && mainWisdom.includes("55") && mainWisdom.includes("JTs"), "SB default wisdom names the clearest jam-to-call swaps");
      }
      assert(!/MSP|ранг на момент|N≥|наблюдаем|выборк|солвер|эталон|малонаблюдаем/i.test(await page.locator('[data-screen="main"]').innerText()), `${route} main lesson hides technical language`);
      await page.getByRole("tab", { name: "3. Чарты" }).click();
      await captureState(page, route, viewport, "ranges");
      assert.equal(await page.locator("#benchmarkRange > *").count(), 169, `${route} has a 13x13 matrix`);
      assert.equal(await page.locator("#benchmarkRange [data-hand]").count(), 169, `${route} default chart has 169/169 observed hand cells`);
      assert.equal(await page.locator("#benchmarkRange .is-unavailable").count(), 0, `${route} default chart has no missing hand cells`);
      assert.equal(await page.locator('[data-screen="ranges"] [data-source-note]').innerText(), "По игре первой лиги", `${route} has one short chart source label`);
      if (route === "/sb-unopened-lesson") {
        for (const stack of ["10-12", "8-10", "6-8", "<6"]) {
          await page.locator(`[data-screen="ranges"] [data-filter="stack"][data-value="${stack}"]`).click();
          assert.equal(await page.locator("#benchmarkRange [data-hand]").count(), 169, `SB unopened ${stack} BB has 169/169 observed hand cells at ${viewport.name}`);
          assert.equal(await page.locator("#benchmarkRange .is-unavailable").count(), 0, `SB unopened ${stack} BB has no missing hand cells at ${viewport.name}`);
          if (viewport.name === "comment" && stack === "8-10") {
            await page.waitForTimeout(450);
            await page.screenshot({ path: "/private/tmp/sb-unopened-chart-8-10-comment.png", fullPage: false });
          }
        }
      }
      await page.getByRole("tab", { name: "4. Сравнение" }).click();
      await captureState(page, route, viewport, "comparison");
      assert.equal(await page.locator("#comparisonGrid .cohort-card").count(), 2, `${route} compares two cohorts`);
      assert.equal(await page.locator("#comparisonGap p").count(), 1, `${route} turns the largest gap into a table rule`);
      await page.getByRole("tab", { name: "5. Мудрости" }).click();
      await captureState(page, route, viewport, "wisdom");
      assert.equal(await page.locator("#insightGrid .insight-card").count(), 3, `${route} renders three data-derived insights`);
      if (route === "/vs-one-raiser-sb-lesson") {
        const wisdomText = await page.locator("#insightGrid").innerText();
        assert(wisdomText.includes("Та же ширина — другой винрейт") && wisdomText.includes("−9,8 BB"), "SB wisdom grid exposes the exact-spot outcome gap");
        if (viewport.name === "comment") {
          await page.waitForTimeout(450);
          await page.screenshot({ path: "/private/tmp/vs-one-raiser-sb-wisdom-comment.png", fullPage: false });
        }
      }
      assert((await page.locator("#stackStory .stack-step").count()) >= minimumStackSteps[route], `${route} renders the full-history stack story from complete chart states`);
      assert(!/MSP|ранг на момент|N≥|наблюдаем|выборк|солвер|эталон|малонаблюдаем/i.test(await page.locator('[data-screen="wisdom"]').innerText()), `${route} wisdom view hides technical language`);
      if (route === "/sb-unopened-lesson") {
        await page.waitForTimeout(350);
        await page.screenshot({ path: `/private/tmp/sb-unopened-wisdom-${viewport.name}.png`, fullPage: false });
      }
      await page.getByRole("tab", { name: "6. Практика" }).click();
      await captureState(page, route, viewport, "practice-landing");
      await page.getByRole("button", { name: "Запустить", exact: true }).click();
      await page.waitForSelector("#practiceTable [data-trainer-simulator-actions]");
      await page.locator("#practiceTable [data-option-key]").first().click();
      assert.equal(await page.locator("#practiceFeedback:not([hidden])").count(), 1, `${route} practice returns cohort feedback`);
      assert.equal(await page.locator("#practiceCoach .feedback-cohort").count(), 2, `${route} practice shows both comparison groups`);
      const geometry = await page.evaluate(() => ({
        overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        actionBottom: document.querySelector("#practiceTable [data-trainer-simulator-actions]")?.getBoundingClientRect().bottom || 0,
        actionWidth: document.querySelector("#practiceTable [data-trainer-simulator-actions]")?.getBoundingClientRect().width || 0,
        tableHeight: document.querySelector("#practiceTable .table-shell")?.getBoundingClientRect().height || 0,
        roomHeight: document.querySelector(".practice-stage .room-stage")?.getBoundingClientRect().height || 0,
        coachHeight: document.querySelector(".practice-stage .coach")?.getBoundingClientRect().height || 0,
        hudStatCount: document.querySelectorAll(".practice-hud > span").length,
        hudStatBackground: getComputedStyle(document.querySelector(".practice-hud > span")).backgroundColor,
        actionHit: (() => {
          const button = document.querySelector("#practiceTable [data-option-key]");
          const rect = button?.getBoundingClientRect();
          if (!rect) return false;
          return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest?.("[data-option-key]") === button;
        })(),
        viewport: [innerWidth, innerHeight],
      }));
      assert(geometry.overflowX <= 1, `${route} has no page-level horizontal overflow at ${viewport.name}`);
      assert(geometry.actionWidth > 0, `${route} action dock is visible at ${viewport.name}`);
      assert(geometry.actionHit, `${route} action dock is not clipped or covered at ${viewport.name}`);
      assert.equal(geometry.hudStatCount, 3, `${route} practice keeps three compact HUD stats at ${viewport.name}`);
      assert.notEqual(geometry.hudStatBackground, "rgba(0, 0, 0, 0)", `${route} practice HUD stats use the shared surface treatment at ${viewport.name}`);
      if (viewport.width > 700) assert(geometry.tableHeight > 360, `${route} practice table uses the available height at ${viewport.name}: ${JSON.stringify(geometry)}`);
      if (viewport.width > 980) assert(Math.abs(geometry.roomHeight - geometry.coachHeight) <= 1, `${route} practice coach aligns with the table surface at ${viewport.name}: ${JSON.stringify(geometry)}`);
      assert.deepEqual(errors, [], `${route} has no browser errors at ${viewport.name}`);
      await captureState(page, route, viewport, "practice-running");
      if (route === "/sb-unopened-lesson") {
        await page.waitForTimeout(350);
        await page.screenshot({ path: `/private/tmp/sb-unopened-practice-${viewport.name}.png`, fullPage: false });
      }
      results.push({ route, viewport: viewport.name, geometry, errors: errors.length });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
