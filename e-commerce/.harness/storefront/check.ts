import { chromium } from "playwright";

const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
const red = { id: "11111111-1111-4111-8111-111111111111", name: "Vermelho" };
const black = { id: "22222222-2222-4222-8222-222222222222", name: "Preto" };
const blue = { id: "33333333-3333-4333-8333-333333333333", name: "Azul" };
const products = [
  {
    code: "ABC234",
    name: "Camisa de corte amplo",
    marketplace: "shopee",
    destinationUrl: "https://shopee.com.br/example",
    imageUrl: "https://example.com/red.svg",
    imageUrls: [
      "https://example.com/red.svg",
      "https://example.com/back.svg",
      "https://example.com/detail.svg",
    ],
    colors: [red, blue],
    sizes: [{ id: "medium", name: "M" }],
  },
  {
    code: "XYZ234",
    name: "Calça de alfaiataria",
    marketplace: "shein",
    destinationUrl: "https://br.shein.com/example",
    imageUrl: "https://example.com/black.svg",
    colors: [black],
    sizes: [],
  },
];
const outfit = {
  code: "OUT-AAAAAAAAAAAAAAAA",
  name: "Contrastes em movimento",
  products,
};
const reads: { path: string; cookie: string | null }[] = [];
let fail = false;
const api = Bun.serve({
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    reads.push({ path: url.pathname, cookie: req.headers.get("cookie") });
    if (url.pathname === "/search/filters")
      return Response.json({
        filters: [
          {
            key: "color",
            label: "Cor",
            type: "choices",
            multiple: true,
            choices: [red, black].map((c) => ({ value: c.id, label: c.name })),
          },
        ],
      });
    if (url.pathname.startsWith("/storefront/")) {
      await Bun.sleep(650);
      if (fail) return new Response(null, { status: 503 });
      const item = url.pathname.includes("/products/")
        ? products.find((p) => p.code === url.pathname.split("/").at(-1))
        : url.pathname.endsWith(outfit.code)
          ? outfit
          : undefined;
      return item
        ? Response.json({ ...item, internalSecret: "MUST-NOT-LEAK" })
        : new Response(null, { status: 404 });
    }
    if (url.pathname === "/search")
      return Response.json({
        items: products,
        limit: 24,
        offset: 0,
        hasMore: false,
      });
    return new Response(null, { status: 404 });
  },
});
const reserve = Bun.serve({ port: 0, fetch: () => new Response() });
const port = reserve.port;
reserve.stop(true);
const origin = `http://127.0.0.1:${port}`;
const server = Bun.spawn(["bun", "run", "start", "--port", String(port)], {
  env: { ...process.env, API_URL: api.url.origin },
  stdout: Bun.file(".harness/storefront/server.log"),
  stderr: Bun.file(".harness/storefront/server.log"),
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${origin}/admin`)).ok) break;
    } catch {}
    await Bun.sleep(100);
  }
  for (const [short, target] of [
    ["/p/abc234", "/products/ABC234"],
    ["/o/out-aaaaaaaaaaaaaaaa", "/outfits/OUT-AAAAAAAAAAAAAAAA"],
  ]) {
    const response = await fetch(origin + short, { redirect: "manual" });
    assert(
      response.status === 307 &&
        response.headers.get("location")?.endsWith(target ?? ""),
      `Bad redirect: ${short}`,
    );
  }
  assert(
    (await fetch(`${origin}/p/ZZZZ`)).status === 404,
    "Missing short code not 404",
  );
  const html = await (await fetch(`${origin}/products/ABC234`)).text();
  assert(
    html.includes(products[0]?.name ?? "") &&
      html.includes('href="https://shopee.com.br/example"'),
    "Product missing in SSR HTML",
  );
  assert(!html.includes("MUST-NOT-LEAK"), "Raw API object leaked");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://example.com/*.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#cec7bc"/><path d="M250 180 160 220 80 400 210 450 240 380 240 800 560 800 560 380 590 450 720 400 640 220 550 180Q400 300 250 180Z" fill="${route.request().url().includes("red") ? "#712b2c" : "#242320"}"/><path d="M250 180Q400 320 550 180" fill="none" stroke="#0e0e0e" stroke-width="10"/></svg>`,
    }),
  );
  await page.goto(`${origin}/p/ABC234`, { waitUntil: "commit" });
  await page.locator("[data-brand-loader]").waitFor();
  await page
    .getByRole("heading", { level: 1, name: products[0]?.name })
    .waitFor();
  await page.locator("[data-brand-loader]").waitFor({ state: "detached" });
  for (const [width, height] of [
    [1440, 1000],
    [1280, 720],
    [1024, 600],
    [390, 844],
    [360, 640],
    [320, 568],
    [844, 390],
    [568, 320],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    const bounds = await page.evaluate(() => {
      const gallery = document
        .querySelector(".product-gallery")
        ?.getBoundingClientRect();
      const cta = document
        .querySelector(".product-cta")
        ?.getBoundingClientRect();
      return {
        gallery: gallery?.toJSON(),
        cta: cta?.toJSON(),
        height: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(
      bounds.gallery &&
        bounds.cta &&
        bounds.gallery.top >= 0 &&
        bounds.cta.top >= 0 &&
        bounds.gallery.bottom <= height &&
        bounds.cta.bottom <= height &&
        !bounds.overflow,
      `Photo/CTA outside viewport ${width}x${height}: ${JSON.stringify(bounds)}`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const buy = page.getByRole("link", { name: /Ir para Shopee/ });
  assert(
    (await buy.getAttribute("href")) === products[0]?.destinationUrl,
    "Wrong purchase destination",
  );
  assert(
    (await buy.getAttribute("rel"))?.includes("sponsored"),
    "Affiliate rel missing",
  );
  assert(
    (
      await page
        .getByRole("link", { name: "Vermelho", exact: true })
        .getAttribute("href")
    )?.includes(`color=${red.id}`),
    "Color catalog link missing",
  );
  await page.getByRole("link", { name: "Azul", exact: true }).waitFor();
  assert(
    (await page.getByRole("link", { name: "Preto", exact: true }).count()) ===
      0,
    "Product shows unrelated catalog colors",
  );
  await page.getByRole("button", { name: "Próxima foto", exact: true }).click();
  await page.getByText("Foto 2 de 3", { exact: true }).waitFor();
  assert(
    (await page
      .locator("[data-gallery-slide]:not([hidden]) img")
      .getAttribute("src")) === products[0]?.imageUrls?.[1],
    "Wrong gallery order",
  );
  await page.getByRole("button", { name: "Ver foto 3", exact: true }).click();
  await page.getByText("Foto 3 de 3", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Ver foto 3", exact: true })
    .press("Home");
  await page.getByText("Foto 1 de 3", { exact: true }).waitFor();
  const backBounds = await page
    .getByRole("link", { name: "Voltar ao catálogo", exact: true })
    .boundingBox();
  const imageBounds = await page
    .locator("[data-gallery-slide]:not([hidden])")
    .boundingBox();
  assert(
    backBounds &&
      imageBounds &&
      backBounds.y + backBounds.height <= imageBounds.y,
    "Back link is not above image",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await buy.hover();
  await page.waitForTimeout(180);
  const hoverIcon = await buy
    .locator(".marketplace-link-icon")
    .evaluate((e) => getComputedStyle(e).transform);
  assert(
    hoverIcon !== "none" && hoverIcon !== "matrix(1, 0, 0, 1, 0, 0)",
    "Marketplace hover did not animate",
  );
  await page.mouse.move(1400, 10);
  await page.screenshot({ path: ".harness/storefront/product-desktop.png" });
  await page.goto(`${origin}/o/${outfit.code}`);
  await page.getByRole("heading", { name: outfit.name }).waitFor();
  await page.locator("[data-brand-loader]").waitFor({ state: "detached" });
  assert(
    (await page.locator("article").count()) === 2,
    "Outfit products missing",
  );
  await page.getByRole("link", { name: "Preto", exact: true }).click();
  await page.waitForURL(/color=/);
  await page.getByText("1 peça nesta cor", { exact: true }).waitFor();
  assert(
    (await page.locator("article").count()) === 1,
    "Outfit color not applied server-side",
  );
  await page.getByRole("link", { name: "Todas", exact: true }).click();
  await page.getByText("2 peças neste outfit", { exact: true }).waitFor();
  await page.screenshot({ path: ".harness/storefront/outfit-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/products/XYZ234`);
  await page.getByRole("heading", { name: products[1]?.name }).waitFor();
  await page.locator("[data-brand-loader]").waitFor({ state: "detached" });
  assert(
    (await page
      .getByRole("link", { name: /Ir para Shein/ })
      .getAttribute("href")) === products[1]?.destinationUrl,
    "Shein destination missing",
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile horizontal overflow",
  );
  assert(
    (await page
      .getByRole("button", { name: "Próxima foto", exact: true })
      .count()) === 0,
    "Legacy single image has unnecessary gallery controls",
  );
  await page.screenshot({
    path: ".harness/storefront/product-mobile.png",
    fullPage: true,
  });
  await page.goto(`${origin}/products/ZZZZ`);
  await page
    .getByRole("heading", { name: "Esta peça saiu de cena." })
    .waitFor();
  assert(
    (await page.locator("[data-brand-loader]").count()) === 0,
    "404 left loader mounted",
  );
  fail = true;
  await page.goto(`${origin}/products/ABC234`);
  await page
    .getByRole("heading", { name: "Não foi possível carregar os detalhes." })
    .waitFor();
  fail = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await page.getByRole("heading", { name: products[0]?.name }).waitFor();
  assert(
    reads.every((r) => !r.cookie),
    "Public DAL forwarded cookies",
  );
  assert(!errors.some((e) => /hydration/i.test(e)), "Hydration error");
  console.log(
    "PASS: gallery order, thumbnails, keyboard, legacy image, multiple colors, routes, SSR, mobile and error recovery.",
  );
} finally {
  await browser?.close();
  server.kill();
  await server.exited;
  api.stop(true);
}
