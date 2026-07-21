import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:4173";
const routes = [
  "/vs-one-raiser-positions-lesson",
  "/vs-one-raiser-sb-lesson",
  "/sb-unopened-lesson",
];
const minimumStackSteps = {
  "/vs-one-raiser-positions-lesson": 8,
  "/vs-one-raiser-sb-lesson": 7,
  "/sb-unopened-lesson": 10,
};
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "comment", width: 1155, height: 870 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 },
];
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
      await page.goto(`${base}${route}`, { waitUntil: "load" });
      await page.waitForSelector("#introTableHost [data-trainer-simulator-actions]");
      assert.equal(await page.locator("#introTableHost [data-option-key]").count(), 4, `${route} has four in-table actions`);
      const firstAction = page.locator("#introTableHost [data-option-key]").first();
      await firstAction.click();
      await page.getByRole("tab", { name: "2. Главное" }).click();
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
      assert.equal(await page.locator("#comparisonGrid .cohort-card").count(), 2, `${route} compares two cohorts`);
      assert.equal(await page.locator("#comparisonGap p").count(), 1, `${route} turns the largest gap into a table rule`);
      await page.getByRole("tab", { name: "5. Мудрости" }).click();
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
      await page.getByRole("button", { name: "Запустить", exact: true }).click();
      await page.waitForSelector("#practiceTable [data-trainer-simulator-actions]");
      await page.locator("#practiceTable [data-option-key]").first().click();
      assert.equal(await page.locator("#practiceFeedback:not([hidden])").count(), 1, `${route} practice returns cohort feedback`);
      assert.equal(await page.locator("#practiceCoach .feedback-cohort").count(), 2, `${route} practice shows both comparison groups`);
      const geometry = await page.evaluate(() => ({
        overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        actionBottom: document.querySelector("#practiceTable [data-trainer-simulator-actions]")?.getBoundingClientRect().bottom || 0,
        actionWidth: document.querySelector("#practiceTable [data-trainer-simulator-actions]")?.getBoundingClientRect().width || 0,
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
      assert.deepEqual(errors, [], `${route} has no browser errors at ${viewport.name}`);
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
