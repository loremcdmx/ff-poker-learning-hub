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

async function actionLabelGeometry(page, rootSelector) {
  return page.locator(`${rootSelector} [data-option-key]`).evaluateAll((buttons) => buttons.map((button) => {
    const label = button.querySelector(".table-action-label");
    const buttonBox = button.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    const buttonStyle = getComputedStyle(button);
    const labelStyle = label ? getComputedStyle(label) : null;
    const parts = [...button.querySelectorAll(".table-action-verb, .table-action-amount")];
    const fits = Boolean(label && labelBox
      && labelBox.left >= buttonBox.left - 1
      && labelBox.right <= buttonBox.right + 1
      && labelBox.top >= buttonBox.top - 1
      && labelBox.bottom <= buttonBox.bottom + 1
      && label.scrollWidth <= label.clientWidth + 1
      && label.scrollHeight <= label.clientHeight + 1
      && parts.every((part) => part.scrollWidth <= part.clientWidth + 1));
    return {
      text: button.getAttribute("aria-label") || button.textContent.trim(),
      buttonWidth: buttonBox.width,
      labelWidth: labelBox?.width || 0,
      labelScrollWidth: label?.scrollWidth || 0,
      buttonFontSize: buttonStyle.fontSize,
      buttonPaddingInline: `${buttonStyle.paddingLeft} ${buttonStyle.paddingRight}`,
      labelFontSize: labelStyle?.fontSize || "",
      fits,
    };
  }));
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
        const overlaps = (a, b) => Boolean(a && b
          && a.left < b.right - 1 && a.right > b.left + 1
          && a.top < b.bottom - 1 && a.bottom > b.top + 1);
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
        const betAmounts = [...document.querySelectorAll("#introTableHost .bet-marker-amount")]
          .filter((node) => getComputedStyle(node).display !== "none" && node.getBoundingClientRect().width > 0)
          .map((node) => {
            const box = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return {
              left: box.left,
              top: box.top,
              right: box.right,
              bottom: box.bottom,
              fontSize: Number.parseFloat(style.fontSize),
              backgroundColor: style.backgroundColor,
              fits: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1,
            };
          });
        const potTextNode = document.querySelector("#introTableHost .pot-text");
        const potTextStyle = potTextNode ? getComputedStyle(potTextNode) : null;
        const aggressorPositionNode = document.querySelector("#introTableHost .seat.is-aggressor .seat-position");
        const heroPositionNode = document.querySelector("#introTableHost .seat.is-hero .seat-position");
        const ordinaryPositionNode = document.querySelector("#introTableHost .seat:not(.is-aggressor):not(.is-hero) .seat-position");
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
          betAmountsReadable: betAmounts.length > 0
            && betAmounts.every((amount) => amount.fits
              && amount.fontSize >= (innerWidth <= 430 ? 12 : 13)
              && amount.backgroundColor !== "rgba(0, 0, 0, 0)"),
          betAmountsInsideTable: betAmounts.every((amount) => contains(tableCard, amount)),
          potTextHasContrast: Boolean(potTextStyle && potTextStyle.backgroundColor !== "rgba(0, 0, 0, 0)"),
          aggressorPositionIsDistinct: Boolean(!aggressorPositionNode || (ordinaryPositionNode
            && getComputedStyle(aggressorPositionNode).backgroundColor !== getComputedStyle(ordinaryPositionNode).backgroundColor)),
          heroPositionIsDistinct: Boolean(heroPositionNode && ordinaryPositionNode
            && getComputedStyle(heroPositionNode).backgroundColor !== getComputedStyle(ordinaryPositionNode).backgroundColor),
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
      assert.equal(introGeometry.betAmountsReadable, true, `${route} renders every live bet as a readable contrast pill at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.betAmountsInsideTable, true, `${route} keeps every live bet label inside the table at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.potTextHasContrast, true, `${route} renders the pot on a contrast pill at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.aggressorPositionIsDistinct, true, `${route} highlights the raiser position at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.heroPositionIsDistinct, true, `${route} highlights Hero's position at ${viewport.name}: ${JSON.stringify(introGeometry)}`);
      assert.equal(introGeometry.controlsInsideHost, true, `${route} keeps the action dock inside the reserved table gutter at ${viewport.name}`);
      assert.equal(introGeometry.visibleFoldBadges, 0, `${route} removes unlabeled fold dots at ${viewport.name}`);
      assert.equal(introGeometry.visibleEmptyBadges, 0, `${route} removes every unlabeled seat-action dot at ${viewport.name}`);
      assert.equal(await page.locator("#introSubtitle, .intro-support, .table-head").count(), 0, `${route} removes all three redundant intro labels at ${viewport.name}`);
      const introActionLabels = await actionLabelGeometry(page, "#introTableHost");
      assert(introActionLabels.every((item) => item.fits), `${route} keeps every intro action label fully visible at ${viewport.name}: ${JSON.stringify(introActionLabels)}`);
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
      const expectedWisdomRuleCards = route === "/sb-unopened-lesson" ? 1 : route === "/vs-one-raiser-positions-lesson" ? 0 : 3;
      assert.equal(await page.locator("#wisdomSlides .wisdom-rule-card").count(), expectedWisdomRuleCards, `${route} keeps a rule card wherever the visual does not carry the lesson itself`);
      const expectedWisdomEvidence = route === "/vs-one-raiser-positions-lesson" ? 2 : 3;
      assert.equal(await page.locator("#wisdomSlides .wisdom-evidence").count(), expectedWisdomEvidence, `${route} supports each rule with a comparison`);
      if (route === "/vs-one-raiser-positions-lesson") {
        assert.equal(await page.locator("#wisdomSlides .slide").count(), 2, "free-position main lesson keeps only two distinct wisdom slides");
        assert.equal(await page.locator("#wisdomCounter").innerText(), "1 из 2", "free-position carousel renumbers the first slide after removing the repeated filter slide");
        assert.equal((await page.locator("#wisdomSlides").innerText()).includes("Сначала реши: продолжать ли вообще"), false, "free-position main lesson removes the repeated continuation-filter slide");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-action-compare-grid > *").count(), 169, "free-position main wisdom compares the full 13x13 action range");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-action-compare-grid .is-unavailable").count(), 0, "free-position main wisdom has no missing cohort comparisons");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-action-band").count(), 338, "free-position main wisdom shows both cohorts in every hand cell");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-action-cohorts > span").count(), 2, "free-position main wisdom directly labels both cohort colors");
        const actionComparisonText = await page.locator("#wisdomSlides .slide.active .wisdom-action-card").innerText();
        assert(actionComparisonText.includes("Какие руки уходят в «колл»") && actionComparisonText.includes("Первая лига") && actionComparisonText.includes("Ранги 15–18") && actionComparisonText.includes("6%") && actionComparisonText.includes("8%"), "free-position main wisdom keeps the exact 28-32 BB default-spot call comparison beside the chart");
        const actionComparisonGeometry = await page.locator("#wisdomSlides .slide.active .wisdom-action-card").evaluate((card) => {
          const outer = card.getBoundingClientRect();
          const grid = card.querySelector(".wisdom-action-compare-grid")?.getBoundingClientRect();
          return {
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            gridInsideCard: Boolean(grid && grid.left >= outer.left - 1 && grid.right <= outer.right + 1 && grid.top >= outer.top - 1 && grid.bottom <= outer.bottom + 1),
            cardScrollOverflow: Math.max(0, card.scrollWidth - card.clientWidth),
          };
        });
        assert.equal(actionComparisonGeometry.overflowX, 0, `free-position main wisdom has no page overflow at ${viewport.name}`);
        assert.equal(actionComparisonGeometry.cardScrollOverflow, 0, `free-position main wisdom has no card overflow at ${viewport.name}`);
        assert.equal(actionComparisonGeometry.gridInsideCard, true, `free-position main wisdom keeps the 13x13 chart inside its card at ${viewport.name}`);
        if (viewport.name === "reported") await page.screenshot({ path: "/private/tmp/vs-one-raiser-positions-wisdom-action-reported.png", fullPage: true });
        await page.locator("#wisdomNext").click();
        assert.equal(await page.locator("#wisdomCounter").innerText(), "2 из 2", "free-position carousel renumbers the short-stack slide as the second and final thought");
        assert((await page.locator("#wisdomSlides .slide.active").innerText()).includes("Часть коллов должна стать пушами"), "free-position carousel moves directly from the range chart to the short-stack lesson");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-compare-grid > *").count(), 169, "free-position short-stack wisdom compares the full 13x13 push range");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-compare-grid .is-unavailable").count(), 0, "free-position short-stack wisdom has no missing cohort comparisons");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-band").count(), 338, "free-position short-stack wisdom shows both cohorts in every hand cell");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-cohorts > span").count(), 2, "free-position short-stack wisdom directly labels both cohort colors");
        const freePositionPushText = await page.locator("#wisdomSlides .slide.active .wisdom-push-card").innerText();
        assert(freePositionPushText.includes("Кто пушит какие руки") && freePositionPushText.includes("18–22 BB") && freePositionPushText.includes("Первая лига") && freePositionPushText.includes("Ранги 15–18") && freePositionPushText.includes("9%") && freePositionPushText.includes("6%"), "free-position short-stack wisdom keeps the exact 18-22 BB push totals beside the range chart");
        const freePositionPushGeometry = await page.locator("#wisdomSlides .slide.active .wisdom-push-card").evaluate((card) => {
          const outer = card.getBoundingClientRect();
          const grid = card.querySelector(".wisdom-push-compare-grid")?.getBoundingClientRect();
          return {
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            gridInsideCard: Boolean(grid && grid.left >= outer.left - 1 && grid.right <= outer.right + 1 && grid.top >= outer.top - 1 && grid.bottom <= outer.bottom + 1),
            cardScrollOverflow: Math.max(0, card.scrollWidth - card.clientWidth),
          };
        });
        assert.equal(freePositionPushGeometry.overflowX, 0, `free-position short-stack wisdom has no page overflow at ${viewport.name}`);
        assert.equal(freePositionPushGeometry.cardScrollOverflow, 0, `free-position short-stack wisdom has no card overflow at ${viewport.name}`);
        assert.equal(freePositionPushGeometry.gridInsideCard, true, `free-position short-stack wisdom keeps the 13x13 chart inside its card at ${viewport.name}`);
        if (viewport.name === "reported") await page.screenshot({ path: "/private/tmp/vs-one-raiser-positions-wisdom-push-reported.png", fullPage: true });
        assert.equal(await page.locator("#wisdomNext").isDisabled(), true, "free-position carousel disables next on the second and final slide");
      }
      if (route === "/sb-unopened-lesson") {
        await page.locator("#wisdomNext").click();
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-range-grid > *").count(), 169, "SB split-range wisdom shows the full 13x13 plan");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-range-grid .is-unavailable").count(), 0, "SB split-range wisdom has no missing hands");
        assert.equal(await page.locator("#wisdomSlides .slide.active .ff-chart-legend > span").count(), 4, "SB split-range wisdom labels all four actions");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-range-total").count(), 4, "SB split-range wisdom gives all four range totals");
        const wisdomRangeGeometry = await page.locator("#wisdomSlides .slide.active .wisdom-range-card").evaluate((card) => {
          const outer = card.getBoundingClientRect();
          const grid = card.querySelector(".wisdom-range-grid")?.getBoundingClientRect();
          return {
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            gridInsideCard: Boolean(grid && grid.left >= outer.left - 1 && grid.right <= outer.right + 1 && grid.top >= outer.top - 1 && grid.bottom <= outer.bottom + 1),
            cardScrollOverflow: Math.max(0, card.scrollWidth - card.clientWidth),
          };
        });
        assert.equal(wisdomRangeGeometry.overflowX, 0, `SB split-range wisdom has no page overflow at ${viewport.name}`);
        assert.equal(wisdomRangeGeometry.cardScrollOverflow, 0, `SB split-range wisdom has no card overflow at ${viewport.name}`);
        assert.equal(wisdomRangeGeometry.gridInsideCard, true, `SB split-range wisdom keeps the 13x13 chart inside its card at ${viewport.name}`);
        if (viewport.name === "reported") await page.screenshot({ path: "/private/tmp/sb-unopened-wisdom-range-reported.png", fullPage: true });
        assert.equal(await page.locator("#wisdomNext").isDisabled(), false, `SB split-range wisdom keeps the next-slide control enabled at ${viewport.name}`);
        await page.locator("#wisdomNext").evaluate((button) => button.click());
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-compare-grid > *").count(), 169, "SB push wisdom compares the full 13x13 range");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-compare-grid .is-unavailable").count(), 0, "SB push wisdom has no missing cohort comparisons");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-band").count(), 338, "SB push wisdom shows both cohorts in every hand cell");
        assert.equal(await page.locator("#wisdomSlides .slide.active .wisdom-push-cohorts > span").count(), 2, "SB push wisdom directly labels both cohort colors");
        const pushComparisonText = await page.locator("#wisdomSlides .slide.active .wisdom-push-cohorts").innerText();
        assert(pushComparisonText.includes("Первая лига") && pushComparisonText.includes("Ранги 15–18") && pushComparisonText.includes("16%") && pushComparisonText.includes("10%"), "SB push wisdom keeps the exact onset-stack totals beside the chart");
        const pushComparisonGeometry = await page.locator("#wisdomSlides .slide.active .wisdom-push-card").evaluate((card) => {
          const outer = card.getBoundingClientRect();
          const grid = card.querySelector(".wisdom-push-compare-grid")?.getBoundingClientRect();
          return {
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            gridInsideCard: Boolean(grid && grid.left >= outer.left - 1 && grid.right <= outer.right + 1 && grid.top >= outer.top - 1 && grid.bottom <= outer.bottom + 1),
            cardScrollOverflow: Math.max(0, card.scrollWidth - card.clientWidth),
          };
        });
        assert.equal(pushComparisonGeometry.overflowX, 0, `SB push comparison has no page overflow at ${viewport.name}`);
        assert.equal(pushComparisonGeometry.cardScrollOverflow, 0, `SB push comparison has no card overflow at ${viewport.name}`);
        assert.equal(pushComparisonGeometry.gridInsideCard, true, `SB push comparison keeps the 13x13 chart inside its card at ${viewport.name}`);
        if (viewport.name === "reported") await page.screenshot({ path: "/private/tmp/sb-unopened-wisdom-push-comparison-reported.png", fullPage: true });
      }
      if (route === "/vs-one-raiser-sb-lesson") {
        const mainWisdom = await page.locator("#wisdomSlides").textContent();
        assert(mainWisdom.includes("Те же 26%, но колл съедает пуш"), "SB default wisdom emphasizes action shape rather than equal continuation");
        assert(mainWisdom.includes("+9 п.п."), "SB default wisdom quantifies the call-for-jam substitution");
        assert(mainWisdom.includes("Та же ширина — другой винрейт"), "SB default wisdom names the outcome difference");
        assert(mainWisdom.includes("−9,8 BB"), "SB default wisdom exposes the exact-spot outcome gap");
        assert(mainWisdom.includes("QJs · 91%"), "SB default wisdom freezes the clearest recent hand-class swap");
        assert(mainWisdom.includes("QJs") && mainWisdom.includes("QTs") && mainWisdom.includes("KTs") && mainWisdom.includes("55") && mainWisdom.includes("JTs"), "SB default wisdom names the clearest jam-to-call swaps");
      }
      assert(!/MSP|ранг на момент|N≥|наблюдаем|выборк|солвер|эталон|малонаблюдаем/i.test(await page.locator('[data-screen="main"]').innerText()), `${route} main lesson hides technical language`);
      await page.getByRole("tab", { name: "3. Чарты" }).click();
      await captureState(page, route, viewport, "ranges");
      assert.equal(await page.locator("#benchmarkRange > *").count(), 169, `${route} has a 13x13 matrix`);
      assert.equal(await page.locator("#benchmarkRange [data-hand]").count(), 169, `${route} default chart has 169/169 observed hand cells`);
      assert.equal(await page.locator("#benchmarkRange .is-unavailable").count(), 0, `${route} default chart has no missing hand cells`);
      assert.equal(await page.locator('[data-screen="ranges"] [data-source-note]').innerText(), "По игре первой лиги", `${route} has one short chart source label`);
      const filterRows = await page.locator('[data-screen="ranges"] .filter-row').evaluateAll((rows) => rows.map((row) => {
        const filters = [...row.querySelectorAll(".ff-chart-filter")];
        const active = filters.filter((filter) => filter.classList.contains("is-active"));
        const activeStyle = active[0] ? getComputedStyle(active[0]) : null;
        return {
          activeCount: active.length,
          activeText: active[0]?.textContent.trim() || "",
          activePressed: active[0]?.getAttribute("aria-pressed") || "",
          activeColor: activeStyle?.color || "",
          activeFontWeight: Number.parseInt(activeStyle?.fontWeight || "0", 10),
          activeBackground: activeStyle?.backgroundImage || "",
          activeShadow: activeStyle?.boxShadow || "",
          activeFits: Boolean(active[0] && active[0].scrollWidth <= active[0].clientWidth + 1),
          groupOverflow: Math.max(0, row.querySelector(".ff-chart-filter-group")?.scrollWidth - row.querySelector(".ff-chart-filter-group")?.clientWidth || 0),
        };
      }));
      assert(filterRows.every((row) => row.activeCount === 1 && row.activePressed === "true"), `${route} keeps exactly one selected option in every filter row at ${viewport.name}: ${JSON.stringify(filterRows)}`);
      assert(filterRows.every((row) => row.activeColor === "rgb(23, 18, 11)" && row.activeFontWeight >= 900), `${route} renders every selected filter with a bold dark label at ${viewport.name}: ${JSON.stringify(filterRows)}`);
      assert(filterRows.every((row) => row.activeBackground !== "none" && row.activeShadow !== "none"), `${route} gives every selected filter a distinct yellow surface and focus ring at ${viewport.name}: ${JSON.stringify(filterRows)}`);
      assert(filterRows.every((row) => row.activeFits), `${route} keeps every selected filter label fully visible at ${viewport.name}: ${JSON.stringify(filterRows)}`);
      if (route === "/vs-one-raiser-positions-lesson") {
        assert.equal(await page.locator('[data-screen="ranges"] [data-filter="size"][data-value="other"]').count(), 0, `free-position sizing never exposes the mixed other bucket at ${viewport.name}`);
        assert.equal(await page.locator('[data-screen="ranges"] [data-filter="stack"].is-active').innerText(), "28–32", `free-position default exposes the actual fine-stack window instead of an exact-looking 30 BB at ${viewport.name}`);
        for (const stack of ["20", "25", "30", "35", "40"]) {
          assert.equal(await page.locator(`[data-screen="ranges"] [data-filter="stack"][data-value="${stack}"]`).count(), 1, `free-position chart exposes the ${stack} BB transition window at ${viewport.name}`);
        }
        const size2x = page.locator('[data-screen="ranges"] [data-filter="size"][data-value="2x"]');
        const size25x = page.locator('[data-screen="ranges"] [data-filter="size"][data-value="2.5x"]');
        assert.equal(await size2x.getAttribute("aria-pressed"), "true", `free-position sizing clearly starts on 2x at ${viewport.name}`);
        await size25x.click();
        assert.equal(await size2x.getAttribute("aria-pressed"), "false", `free-position sizing removes the old 2x state after switching at ${viewport.name}`);
        assert.equal(await size25x.getAttribute("aria-pressed"), "true", `free-position sizing clearly moves the selected state to 2.5x at ${viewport.name}`);
        await size2x.click();
        const heroBtn = page.locator('[data-screen="ranges"] [data-filter="hero"][data-value="BTN"]');
        const heroCo = page.locator('[data-screen="ranges"] [data-filter="hero"][data-value="CO"]');
        await heroBtn.click();
        await page.locator('[data-screen="ranges"] [data-filter="opener"][data-value="HJ"]').click();
        await size2x.click();
        await page.locator('[data-screen="ranges"] [data-filter="stack"][data-value="30"]').click();
        await page.locator('#benchmarkRange [data-hand="88"]').click();
        const boundary88 = await page.locator("#benchmarkHandDetail").innerText();
        assert(boundary88.includes("СМЕШАННАЯ ГРАНИЦА") && boundary88.includes("нет одной обязательной кнопки") && boundary88.includes("Колл\n34%") && boundary88.includes("3-бет пуш\n46%"), `free-position 88 at 28-32 BB is shown as a mixed boundary, not a categorical shove, at ${viewport.name}`);
        await heroCo.click();
      }
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
      if (route === "/sb-unopened-lesson") {
        await page.locator('[data-screen="field"] [data-filter="stack"][data-value="12-15"]').click();
      }
      await captureState(page, route, viewport, "comparison");
      const expectedComparisonCohorts = route === "/vs-one-raiser-positions-lesson" ? 3 : 2;
      assert.equal(await page.locator("#comparisonGrid .cohort-card").count(), expectedComparisonCohorts, `${route} renders every required comparison cohort`);
      assert.equal(await page.locator("#comparisonGrid .comparison-range-grid").count(), expectedComparisonCohorts, `${route} shows one full range chart for each cohort`);
      assert.equal(await page.locator("#comparisonGrid .comparison-range-grid > *").count(), 169 * expectedComparisonCohorts, `${route} comparison renders every full 13x13 chart`);
      assert.equal(await page.locator("#comparisonGrid .comparison-range-grid .is-unavailable").count(), 0, `${route} comparison charts have no missing hands`);
      assert.equal(await page.locator("#comparisonGrid .comparison-range-key .ff-chart-legend > span").count(), 4, `${route} comparison uses one shared four-action legend`);
      assert.equal(await page.locator("#comparisonGrid .cohort-action-bar").count(), 0, `${route} replaces aggregate-only strips with hand charts`);
      const comparisonGeometry = await page.locator("#comparisonGrid .cohort-card").evaluateAll((cards) => cards.map((card) => {
        const outer = card.getBoundingClientRect();
        const grid = card.querySelector(".comparison-range-grid")?.getBoundingClientRect();
        return {
          gridInsideCard: Boolean(grid && grid.left >= outer.left - 1 && grid.right <= outer.right + 1 && grid.top >= outer.top - 1 && grid.bottom <= outer.bottom + 1),
          cardScrollOverflow: Math.max(0, card.scrollWidth - card.clientWidth),
          pageOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      }));
      assert(comparisonGeometry.every((item) => item.gridInsideCard), `${route} keeps both comparison charts inside their cards at ${viewport.name}: ${JSON.stringify(comparisonGeometry)}`);
      assert(comparisonGeometry.every((item) => item.cardScrollOverflow === 0), `${route} comparison cards do not overflow at ${viewport.name}: ${JSON.stringify(comparisonGeometry)}`);
      assert(comparisonGeometry.every((item) => item.pageOverflowX === 0), `${route} comparison has no horizontal page overflow at ${viewport.name}: ${JSON.stringify(comparisonGeometry)}`);
      if (route === "/vs-one-raiser-positions-lesson") {
        assert.equal(await page.locator("#comparisonGrid").getAttribute("class"), "comparison-grid is-three-cohort", "free-position comparison uses the three-cohort layout");
        const comparisonText = (await page.locator("#comparisonGrid").innerText()).toLowerCase();
        assert(comparisonText.includes("первая лига") && comparisonText.includes("2–3 лиги") && comparisonText.includes("новички"), "free-position comparison directly labels all three cohorts");
        assert.equal(await page.locator("#comparisonGrid .comparison-range-grid .is-unavailable").count(), 0, `free-position comparison has 507/507 source-backed hand cells at ${viewport.name}`);
        assert((await page.locator("#comparisonGrid .cohort-leagues2_3 .is-cohort-difference").count()) > 0, `free-position comparison outlines ranks 6-14 hand-plan changes at ${viewport.name}`);
        assert((await page.locator("#comparisonGrid .cohort-r15_18 .is-cohort-difference").count()) > 0, `free-position comparison outlines novice hand-plan changes at ${viewport.name}`);
        assert.equal(await page.locator("#comparisonGrid .cohort-stats small").count(), 12, "free-position comparison puts per-action deltas under all three charts");
        if (viewport.name === "reported") await page.screenshot({ path: "/private/tmp/vs-one-raiser-positions-comparison-triad-reported.png", fullPage: true });
        if (viewport.name === "mobile") await page.screenshot({ path: "/private/tmp/vs-one-raiser-positions-comparison-triad-mobile.png", fullPage: true });
      }
      if (route === "/sb-unopened-lesson") {
        assert((await page.locator("#comparisonGrid .is-cohort-difference").count()) > 0, `SB unopened comparison outlines hands whose main action changes at ${viewport.name}`);
        const comparisonKey = await page.locator("#comparisonGrid .comparison-range-key").innerText();
        assert(comparisonKey.includes("Жёлтая рамка") && /Новички:\s*\d+\s*рук/.test(comparisonKey), "SB unopened comparison directly explains and counts the outlined differences");
        if (viewport.name === "reported") await page.screenshot({ path: "/private/tmp/sb-unopened-comparison-ranges-reported.png", fullPage: true });
        if (viewport.name === "mobile") await page.screenshot({ path: "/private/tmp/sb-unopened-comparison-ranges-mobile.png", fullPage: true });
      }
      assert.equal(await page.locator("#comparisonGap p").count(), 1, `${route} turns the largest gap into a table rule`);
      await page.getByRole("tab", { name: "5. Мудрости" }).click();
      await captureState(page, route, viewport, "wisdom");
      const expectedInsightCards = route === "/vs-one-raiser-positions-lesson" ? 2 : 3;
      assert.equal(await page.locator("#insightGrid .insight-card").count(), expectedInsightCards, `${route} renders only distinct data-derived insights`);
      if (route === "/vs-one-raiser-positions-lesson") {
        assert.equal((await page.locator("#insightGrid").innerText()).includes("Сначала реши: продолжать ли вообще"), false, "free-position wisdom grid removes the same repeated filter card");
      }
      if (route === "/sb-unopened-lesson") {
        assert.equal(await page.locator("#insightGrid .insight-rule").count(), 2, "SB unopened removes the repeated table rule from the third insight only");
        assert.equal(await page.locator("#insightGrid .insight-card:nth-child(3) .insight-rule").count(), 0, "SB unopened third insight has no redundant table rule");
      }
      if (route === "/vs-one-raiser-sb-lesson") {
        const wisdomText = await page.locator("#insightGrid").innerText();
        assert(wisdomText.includes("Та же ширина — другой винрейт") && wisdomText.includes("−9,8 BB"), "SB wisdom grid exposes the exact-spot outcome gap");
        if (viewport.name === "comment") {
          await page.waitForTimeout(450);
          await page.screenshot({ path: "/private/tmp/vs-one-raiser-sb-wisdom-comment.png", fullPage: false });
        }
      }
      assert((await page.locator("#stackStory .stack-step").count()) >= minimumStackSteps[route], `${route} renders the full-history stack story from complete chart states`);
      assert.equal(await page.locator("#stackStory .stack-size-badge").count(), await page.locator("#stackStory .stack-step").count(), `${route} gives every ladder step a prominent stack-size badge`);
      const stackBadgeGeometry = await page.locator("#stackStory .stack-step").evaluateAll((steps) => steps.map((step) => {
        const card = step.getBoundingClientRect();
        const badgeNode = step.querySelector(".stack-size-badge");
        const badge = badgeNode?.getBoundingClientRect();
        const label = badgeNode?.querySelector("b");
        return {
          badgeInsideCard: Boolean(badge && badge.left >= card.left - 1 && badge.right <= card.right + 1 && badge.top >= card.top - 1 && badge.bottom <= card.bottom + 1),
          badgeHeight: badge?.height || 0,
          labelFontSize: Number.parseFloat(label ? getComputedStyle(label).fontSize : "0"),
          selected: step.classList.contains("is-selected"),
          background: badgeNode ? getComputedStyle(badgeNode).backgroundColor : "",
          cardScrollOverflow: Math.max(0, step.scrollWidth - step.clientWidth),
          pageOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      }));
      assert(stackBadgeGeometry.every((item) => item.badgeInsideCard), `${route} keeps every stack-size badge inside its step at ${viewport.name}: ${JSON.stringify(stackBadgeGeometry)}`);
      assert(stackBadgeGeometry.every((item) => item.badgeHeight >= 29 && item.labelFontSize >= 15), `${route} keeps stack sizes visually prominent at ${viewport.name}: ${JSON.stringify(stackBadgeGeometry)}`);
      assert(stackBadgeGeometry.every((item) => item.cardScrollOverflow === 0 && item.pageOverflowX === 0), `${route} stack ladder stays overflow-free at ${viewport.name}: ${JSON.stringify(stackBadgeGeometry)}`);
      const selectedStackBadge = stackBadgeGeometry.find((item) => item.selected);
      const ordinaryStackBadge = stackBadgeGeometry.find((item) => !item.selected);
      assert(selectedStackBadge && ordinaryStackBadge && selectedStackBadge.background !== ordinaryStackBadge.background, `${route} highlights the currently selected stack size at ${viewport.name}`);
      assert(!/MSP|ранг на момент|N≥|наблюдаем|выборк|солвер|эталон|малонаблюдаем/i.test(await page.locator('[data-screen="wisdom"]').innerText()), `${route} wisdom view hides technical language`);
      if (route === "/sb-unopened-lesson") {
        await page.waitForTimeout(350);
        await page.screenshot({ path: `/private/tmp/sb-unopened-wisdom-${viewport.name}.png`, fullPage: false });
        if (viewport.name === "reported") await page.locator("#stackStory").screenshot({ path: "/private/tmp/sb-unopened-stack-sizes-reported.png" });
        if (viewport.name === "mobile") await page.locator("#stackStory").screenshot({ path: "/private/tmp/sb-unopened-stack-sizes-mobile.png" });
      }
      await page.getByRole("tab", { name: "6. Практика" }).click();
      await captureState(page, route, viewport, "practice-landing");
      await page.getByRole("button", { name: "Запустить", exact: true }).click();
      await page.waitForSelector("#practiceTable [data-trainer-simulator-actions]");
      if (route === "/vs-one-raiser-positions-lesson") {
        const practiceRaiser = await page.locator("#practiceTable").evaluate((host) => {
          const hero = host.querySelector(".seat.is-hero");
          const aggressor = host.querySelector(".seat.is-aggressor:not(.is-hero)");
          return {
            heroPosition: hero?.querySelector(".seat-position")?.textContent.trim() || "",
            aggressorPosition: aggressor?.querySelector(".seat-position")?.textContent.trim() || "",
            aggressorCount: host.querySelectorAll(".seat.is-aggressor:not(.is-hero)").length,
            heroLiveBetCount: host.querySelectorAll(".hero-felt-bet").length,
            actionContext: host.querySelector(".action-status em")?.textContent.trim() || "",
          };
        });
        assert.equal(practiceRaiser.aggressorCount, 1, `free-position practice renders one separate raiser at ${viewport.name}: ${JSON.stringify(practiceRaiser)}`);
        assert.notEqual(practiceRaiser.heroPosition, practiceRaiser.aggressorPosition, `free-position practice never makes Hero the opener at ${viewport.name}: ${JSON.stringify(practiceRaiser)}`);
        assert.equal(practiceRaiser.heroLiveBetCount, 0, `free-position practice keeps the pre-decision Hero stack uncommitted at ${viewport.name}: ${JSON.stringify(practiceRaiser)}`);
        assert.match(practiceRaiser.actionContext, /raise|рейз/i, `free-position practice names the raiser's live action at ${viewport.name}: ${JSON.stringify(practiceRaiser)}`);
      }
      const practiceActionLabels = await actionLabelGeometry(page, "#practiceTable");
      assert(practiceActionLabels.every((item) => item.fits), `${route} keeps every practice action label fully visible at ${viewport.name}: ${JSON.stringify(practiceActionLabels)}`);
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
