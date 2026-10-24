import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const origin = process.env.TEST_ORIGIN ?? "http://localhost:3001";
try {
  for (const reduced of [false, true]) {
    const page = await browser.newPage({
      viewport: { width: reduced ? 390 : 1280, height: 844 },
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.addInitScript(() => {
      const audit = { pendingFrames: 0, prematureScroll: 0 };
      Object.assign(window, { anchorAudit: audit });
      function sample() {
        const intro = document.querySelector(".hero-intro");
        if (intro?.getAttribute("data-scroll-ready") === "false") {
          audit.pendingFrames++;
          if (window.scrollY > 1) audit.prematureScroll++;
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await page.goto(`${origin}/#pecas`, { waitUntil: "commit" });
    await page.locator('.hero-intro[data-scroll-ready="true"]').waitFor();
    await page.waitForFunction(() => window.scrollY > 20);
    const audit = await page.evaluate(
      () =>
        Reflect.get(window, "anchorAudit") as {
          pendingFrames: number;
          prematureScroll: number;
        },
    );
    if (!audit.pendingFrames || audit.prematureScroll)
      throw new Error(`Premature direct hash scroll: ${JSON.stringify(audit)}`);
    if (!reduced) {
      const product = page.locator("[data-product-link]").first();
      if (await product.count()) {
        await product.click();
        await page
          .getByRole("link", { name: "Voltar ao catálogo", exact: true })
          .waitFor();
        await page.evaluate(() =>
          Object.assign(Reflect.get(window, "anchorAudit"), {
            pendingFrames: 0,
            prematureScroll: 0,
          }),
        );
        await page
          .getByRole("link", { name: "Voltar ao catálogo", exact: true })
          .click();
        await page.locator('.hero-intro[data-scroll-ready="true"]').waitFor();
        await page.waitForFunction(() => window.scrollY > 20);
        const returned = await page.evaluate(
          () =>
            Reflect.get(window, "anchorAudit") as {
              pendingFrames: number;
              prematureScroll: number;
            },
        );
        if (!returned.pendingFrames || returned.prematureScroll)
          throw new Error(
            `Premature return hash scroll: ${JSON.stringify(returned)}`,
          );
      }
      await page.goto(origin);
      await page.locator('.hero-intro[data-products="ready"]').waitFor();
      await page.evaluate(() => {
        window.location.hash = "pecas";
      });
      await page.locator('.hero-intro[data-scroll-ready="true"]').waitFor();
      await page.waitForFunction(() => window.scrollY > 20);
      const clicked = await page.evaluate(
        () => Reflect.get(window, "anchorAudit") as { prematureScroll: number },
      );
      if (clicked.prematureScroll)
        throw new Error("Hash change scrolled during entrance");
    }
    console.log(
      `PASS: hash waits for all entrance tweens (${reduced ? "mobile/reduced" : "desktop/direct/return/hashchange"}).`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
