import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  await page.goto("https://outfit.hellohello.is/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(7000);
  const cards = page.locator("[data-product]");
  console.log("cards", await cards.count());
  const card = cards.first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  const inspect = () =>
    card.evaluate((el) => ({
      rect: el.getBoundingClientRect().toJSON(),
      html: el.innerHTML.slice(0, 4400),
      images: Array.from(el.querySelectorAll("img")).map((img) => ({
        kind: img.getAttribute("data-image"),
        src: img.currentSrc,
        clip: getComputedStyle(img).clipPath,
        scale: getComputedStyle(img).scale,
        transform: getComputedStyle(img).transform,
        filter: getComputedStyle(img).filter,
        duration: getComputedStyle(img).transitionDuration,
        easing: getComputedStyle(img).transitionTimingFunction,
      })),
    }));
  const before = await inspect();
  console.log("BEFORE", JSON.stringify(before));
  await card.hover();
  await page.waitForTimeout(250);
  console.log("MID", JSON.stringify((await inspect()).images));
  await page.waitForTimeout(450);
  console.log("AFTER", JSON.stringify((await inspect()).images));
  await card.screenshot({
    path: "research/references/outfit-motion/hover.png",
  });
  await Bun.write(
    "research/references/outfit-motion/runtime.json",
    JSON.stringify({ before, after: await inspect() }, null, 2),
  );
} finally {
  await browser.close();
}
