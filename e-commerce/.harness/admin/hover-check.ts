import { chromium } from "playwright";
import sharp from "sharp";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.TEST_ORIGIN ?? "http://localhost:3001");
  await page.locator('.hero-intro[data-products="ready"]').waitFor();
  const card = page.locator("[data-catalog-card]").first();
  const button = card.locator("[data-product-link]");
  await card.evaluate(async (element) => {
    const photo = (color: string) =>
      `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path fill="${color}" d="M0 0h200v200H0z"/></svg>`)}`;
    const front = element.querySelector<HTMLImageElement>(
      '[data-image="front"]',
    );
    const back = element.querySelector<HTMLImageElement>(
      "[data-clarity-image]",
    );
    if (!front || !back) throw new Error("Missing product layers");
    front.src = photo("#ff0000");
    back.src = photo("#0000ff");
    await Promise.all([front.decode(), back.decode()]);
  });
  const expectColor = async (channel: number) => {
    const { data, info } = await sharp(await button.screenshot())
      .raw()
      .toBuffer({ resolveWithObject: true });
    const offset =
      (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) *
      info.channels;
    if (
      data[offset + channel] < 240 ||
      data[offset + (channel === 2 ? 0 : 2)] > 15
    )
      throw new Error("Unexpected visible image layer");
  };
  for (let pass = 0; pass < 2; pass++) {
    await button.hover();
    await page.waitForTimeout(100);
    if (
      Number(await card.locator("feDisplacementMap").getAttribute("scale")) <= 0
    )
      throw new Error("Jitter did not start");
    await page.waitForTimeout(600);
    await expectColor(2);
    await page.waitForTimeout(1100);
    await expectColor(2);
    const stable = await card
      .locator('[data-image="back"]')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          style.scale === "1" &&
          style.transform === "none" &&
          element.closest("figure")?.matches(":hover")
        );
      });
    if (!stable)
      throw new Error("Hover geometry was reset while pointer remained");
    await page.mouse.move(1200, 100);
    await page.waitForTimeout(650);
    await expectColor(0);
  }
  console.log(
    "PASS: hover layer stays visible after jitter, closes only on leave, and survives repeated entry.",
  );
} finally {
  await browser.close();
}
