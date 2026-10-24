import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
try {
  await page.goto("http://localhost:3001");
  await page
    .locator("[data-brand-loader]")
    .waitFor({ state: "detached", timeout: 25000 });
  await page.waitForTimeout(3200);
  for (const width of [768, 900, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await page.locator("header").evaluate((header) => {
      const logo = header.querySelector('a[aria-label="BLACK HEM — início"]');
      const nav = header.querySelector('nav[aria-label="Navegação principal"]');
      const cta = header.querySelector(':scope > a[href="#pecas"]');
      if (!logo || !nav || !cta) throw new Error("Missing navigation region");
      return {
        logo: logo.getBoundingClientRect().toJSON(),
        nav: nav.getBoundingClientRect().toJSON(),
        cta: cta.getBoundingClientRect().toJSON(),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(
      bounds.logo.right <= bounds.nav.left,
      `Logo overlaps nav at ${width}`,
    );
    assert(bounds.nav.right <= bounds.cta.left, `Nav overlaps CTA at ${width}`);
    assert(!bounds.overflow, `Horizontal overflow at ${width}`);
    assert(
      !(await page
        .getByRole("button", { name: "Abrir navegação" })
        .isVisible()),
      `Mobile menu visible at ${width}`,
    );
    const nav = page.getByRole("navigation", {
      name: "Navegação principal",
      exact: true,
    });
    await nav.getByRole("link", { name: "Filtrar peças", exact: true }).hover();
    await page.waitForTimeout(500);
    if (width === 1280)
      await page
        .locator("header")
        .screenshot({ path: ".harness/admin/navbar-desktop.png" });
    console.log(
      `PASS: ${width}px — logo, nav and CTA do not overlap; mobile toggle hidden.`,
    );
  }
  for (const width of [390, 767]) {
    await page.setViewportSize({ width, height: 844 });
    const toggle = page.getByRole("button", { name: "Abrir navegação" });
    assert(await toggle.isVisible(), `Mobile toggle missing at ${width}`);
    assert(
      !(await page
        .getByRole("navigation", { name: "Navegação principal", exact: true })
        .isVisible()),
      `Desktop nav visible at ${width}`,
    );
    await toggle.click();
    await page
      .getByRole("navigation", { name: "Navegação no celular" })
      .getByRole("link", { name: "Filtrar peças" })
      .waitFor();
    await page.waitForTimeout(400);
    assert(
      (await page
        .getByRole("button", { name: "Fechar navegação" })
        .locator("span[aria-hidden='true']")
        .last()
        .textContent()) === "Fechar",
      "Open menu label is stale",
    );
    if (width === 390)
      await page
        .locator("header")
        .screenshot({ path: ".harness/admin/navbar-mobile.png" });
    await page.keyboard.press("Escape");
    await page
      .getByRole("navigation", { name: "Navegação no celular" })
      .waitFor({ state: "hidden" });
    assert(
      await toggle.evaluate((el) => el === document.activeElement),
      "Escape did not restore menu focus",
    );
    console.log(
      `PASS: ${width}px — mobile navigation opens, closes and restores focus.`,
    );
  }
  assert(!errors.length, `Browser errors: ${errors.join(", ")}`);
} finally {
  await browser.close();
}
