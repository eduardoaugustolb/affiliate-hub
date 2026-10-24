import { chromium } from "playwright";

// A real local HTTP fixture exercises browser -> Next -> API -> streamed HTML.
// It never reads credentials or writes to the project's database.
const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
const sleep = (ms: number) => Bun.sleep(ms);
const records: { path: string; cookie: boolean; method: string }[] = [];
let unavailable = false;
let products = [
  {
    id: "1",
    code: "ABCD23",
    name: "Camisa SSR",
    marketplace: "shopee",
    status: "active",
    imageUrl: "https://example.com/image.jpg",
    imageUrls: [
      "https://example.com/image.jpg",
      "https://example.com/back.jpg",
    ],
    destinationUrl: "https://example.com/product",
    createdAt: "2026-10-19",
    updatedAt: "2026-10-19",
  },
];
const filters = [
  {
    key: "name",
    label: "Nome do produto",
    type: "text",
    match: "contains",
    maxLength: 160,
  },
  {
    key: "productCode",
    label: "Código do produto",
    type: "text",
    match: "exact",
    maxLength: 6,
  },
  {
    key: "size",
    label: "Tamanho",
    type: "choices",
    multiple: true,
    choices: [{ value: "size-m", label: "M" }],
  },
  { key: "color", label: "Cor", type: "choices", multiple: true, choices: [] },
];
const outfits = new Map<
  string,
  { code: string; name: string; productCodes: string[] }
>();
const api = Bun.serve({
  port: 0,
  async fetch(request) {
    const url = new URL(request.url),
      path = url.pathname;
    const authorized = request.headers
      .get("cookie")
      ?.includes("session=fixture");
    records.push({
      path,
      cookie: !!request.headers.get("cookie"),
      method: request.method,
    });
    const json = (body: unknown, status = 200) =>
      Response.json(body, { status });
    if (path === "/search/filters") return json({ filters });
    if (path === "/search") {
      await sleep(4000);
      if (unavailable) return json({}, 503);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return json({
        items: products.filter((p) =>
          p.name
            .toLowerCase()
            .includes((url.searchParams.get("name") ?? "").toLowerCase()),
        ),
        limit: 24,
        offset,
        hasMore: offset === 0,
      });
    }
    if (path === "/auth/login")
      return new Response(null, {
        headers: {
          "Set-Cookie": "session=fixture; HttpOnly; Path=/; SameSite=Strict",
        },
      });
    if (path === "/auth/logout")
      return new Response(null, {
        headers: {
          "Set-Cookie":
            "session=; Max-Age=0; HttpOnly; Path=/; SameSite=Strict",
        },
      });
    if (!authorized) return json({}, 401);
    if (path === "/auth/me")
      return json({
        id: "1",
        name: "Admin SSR",
        email: "admin@example.com",
        role: "admin",
      });
    await sleep(250);
    if (path === "/products" && request.method === "GET") return json(products);
    if (path === "/products" && request.method === "POST") {
      const body = await request.json();
      products = [
        ...products,
        { ...products[0], ...body, id: "2", code: "EFGH45" },
      ];
      return new Response(null, { status: 201 });
    }
    if (path.endsWith("/filter-options"))
      return request.method === "GET"
        ? json({ optionIds: ["size-m"] })
        : new Response(null, { status: 204 });
    if (path.startsWith("/products/"))
      return json(products.find((p) => p.code === path.split("/")[2]));
    if (path === "/outfits" && request.method === "POST") {
      const body = await request.json();
      const outfit = { code: "LOOK23", ...body };
      outfits.set("LOOK23", outfit);
      return json(outfit, 201);
    }
    if (path.startsWith("/outfits/"))
      return json(outfits.get(path.split("/")[2] ?? "") ?? {}, 200);
    return new Response(null, { status: 204 });
  },
});
const reserve = Bun.serve({ port: 0, fetch: () => new Response() });
const port = reserve.port;
reserve.stop(true);
const origin = `http://127.0.0.1:${port}`;
const log = Bun.file(".harness/admin/server.log");
const server = Bun.spawn(["bun", "run", "start", "--port", String(port)], {
  env: {
    ...process.env,
    API_URL: api.url.origin,
    SESSION_COOKIE_NAME: "session",
  },
  stdout: log,
  stderr: log,
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${origin}/admin`);
      await r.text();
      ready = r.ok;
      if (ready) break;
    } catch {}
    await sleep(150);
  }
  assert(ready, "Next server did not start");
  assert(
    (await fetch(`${origin}/api/admin/products`)).status === 401,
    "HTTP adapter bypassed DAL authentication",
  );
  assert(
    (
      await fetch(`${origin}/api/admin/products`, {
        method: "POST",
        headers: {
          origin: "https://elsewhere.test",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status === 403,
    "HTTP adapter allowed cross-origin mutation",
  );
  const response = await fetch(origin);
  if (!response.body) throw new Error("Missing response stream");
  const reader = response.body.getReader();
  const first = await reader.read();
  const firstText = new TextDecoder().decode(first.value);
  assert(
    firstText.includes("data-brand-loader"),
    "Initial streamed shell lacks brand loader",
  );
  let html = firstText;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    html += new TextDecoder().decode(chunk.value);
  }
  assert(html.includes("Camisa SSR"), "Product missing from server HTML");
  assert(
    !records.filter((r) => r.path === "/search").some((r) => r.cookie),
    "Public SSR forwarded session cookies",
  );
  console.log(
    "PASS: streamed fallback precedes API result; products rendered in server HTML.",
  );
  browser = await chromium.launch({ headless: true });
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(origin);
  await staticPage
    .getByText("Camisa SSR", { exact: true })
    .waitFor({ state: "attached" });
  await staticPage.goto(`${origin}/admin`);
  await staticPage
    .getByText("Seu catálogo.", { exact: true })
    .waitFor({ state: "attached" });
  await noJs.close();
  console.log(
    "PASS: home and admin login are present in server HTML without hydration.",
  );
  const page = await browser.newPage();
  const errors: string[] = [];
  const clientReads: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (req) => {
    if (req.method() === "GET" && /\/api\/(admin|catalog)\//.test(req.url()))
      clientReads.push(req.url());
  });
  await page.addInitScript(() => {
    const audit = { pendingFrames: 0, violations: 0, staggerFrames: 0 };
    Object.assign(window, { entranceAudit: audit });
    function sample() {
      const intro = document.querySelector(".hero-intro");
      if (intro?.getAttribute("data-products") === "pending") {
        const cards = intro.querySelectorAll("[data-catalog-card]");
        if (cards.length) audit.pendingFrames++;
        for (const card of cards) {
          const style = getComputedStyle(card);
          if (style.visibility !== "hidden" && Number(style.opacity) > 0)
            audit.violations++;
        }
      }
      if (intro?.getAttribute("data-title") === "pending") {
        const controls = intro.querySelector("[data-catalog-controls]");
        if (controls) {
          const style = getComputedStyle(controls);
          if (style.visibility !== "hidden" && Number(style.opacity) > 0)
            audit.violations++;
        }
      }
      const fields = document.querySelectorAll(
        "#filtros > div:first-child > [data-hero-item]",
      );
      if (fields.length > 1) {
        const first = Number(getComputedStyle(fields[0]).opacity);
        const second = Number(getComputedStyle(fields[1]).opacity);
        if (first > second && second < 1) audit.staggerFrames++;
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.goto(origin, { waitUntil: "commit" });
  await page.locator("[data-brand-loader]").first().waitFor();
  assert(
    (await page.locator("[data-brand-loader] p").textContent()) === "BH",
    "Loader must show only BH",
  );
  assert(
    (await page.locator("[data-brand-loader] p span").count()) === 0,
    "Loader must remain static",
  );
  const loaderTop = await page
    .locator("[data-brand-loader] p")
    .evaluate((element) => element.getBoundingClientRect().top);
  await page.screenshot({ path: ".harness/admin/loader.png" });
  await page.getByText("Camisa SSR", { exact: true }).waitFor();
  await page.locator("[data-brand-loader]").waitFor({ state: "detached" });
  await page.waitForFunction(
    () =>
      document.querySelector("#hero-title")?.querySelectorAll("span").length,
  );
  const heroTop = await page
    .locator("#hero-title")
    .evaluate((element) => element.getBoundingClientRect().top);
  assert(
    Math.abs(loaderTop - heroTop) < 1,
    `Desktop loader Y ${loaderTop} differs from hero Y ${heroTop}`,
  );
  console.log(`PASS: desktop loader and hero align at Y=${heroTop}px.`);
  await page.locator('.hero-intro[data-products="ready"]').waitFor();
  assert(
    await page.locator("html").evaluate((e) => e.classList.contains("lenis")),
    "Lenis missing",
  );
  const entranceAudit = await page.evaluate(
    () =>
      Reflect.get(window, "entranceAudit") as {
        pendingFrames: number;
        violations: number;
        staggerFrames: number;
      },
  );
  assert(
    entranceAudit.pendingFrames > 0,
    "Entrance audit missed pending phase",
  );
  assert(
    entranceAudit.violations === 0,
    "Content appeared before entrance prerequisites",
  );
  assert(
    entranceAudit.staggerFrames > 0,
    "Inputs did not animate individually",
  );
  console.log(
    "PASS: frame-by-frame entrance audit: title → controls → products.",
  );
  const card = page.locator("[data-catalog-card]").first();
  await card.hover();
  await page.waitForTimeout(120);
  const jitter = await card.locator("feDisplacementMap").getAttribute("scale");
  assert(Number(jitter) > 0, "Product jitter did not start");
  await page.waitForTimeout(600);
  const clear = await card
    .locator("[data-clarity-image]")
    .evaluate((e) => getComputedStyle(e).filter);
  assert(clear === "none", `Product did not settle to sharp image: ${clear}`);
  await page.screenshot({ path: ".harness/admin/motion.png" });
  console.log("PASS: Lenis, product jitter resolves to sharp without glow.");
  assert(
    (await page.getByLabel("Nome do produto", { exact: true }).count()) === 0,
    "Name filter removed from home",
  );
  await page.getByLabel("Código do produto", { exact: true }).fill("ABCD23");
  await page.getByRole("button", { name: "Buscar peças", exact: true }).click();
  await page.waitForURL(/name=Camisa/);
  await page.getByText("Camisa SSR", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Próximas peças" }).click();
  await page.waitForURL(/offset=24/);
  await page.locator("[data-brand-loader]").waitFor({ state: "detached" });
  assert(
    records.some((r) => r.path === "/search"),
    "SSR search did not reach API",
  );
  await page.goto(`${origin}/admin`);
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("fixture");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByText("Camisa SSR", { exact: true }).waitFor();
  for (const [section, heading, label] of [
    ["products", "Produtos", "Produtos"],
    ["filters", "Filtros do catálogo", "Filtros"],
    ["outfits", "Outfits", "Outfits"],
  ]) {
    await page.goto(`${origin}/admin/${section}`);
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    assert(
      await page
        .getByRole("navigation", { name: "Seções do admin" })
        .getByRole("button", { name: label, exact: true })
        .isDisabled(),
      `Active route ${section}`,
    );
    if (section !== "products")
      assert(
        (await page
          .getByText("Cadastre peças e mantenha seus links atualizados.")
          .count()) === 0,
        `Products leaked into ${section}`,
      );
  }
  await page.goBack();
  await page
    .getByRole("heading", { name: "Filtros do catálogo", exact: true })
    .waitFor();
  await page.goForward();
  await page.getByRole("heading", { name: "Outfits", exact: true }).waitFor();
  await page.goto(`${origin}/admin/products`);
  await page.getByText("Camisa SSR", { exact: true }).waitFor();
  console.log(
    "PASS: distinct sections on direct access, reload, back and forward.",
  );
  for (const width of [320, 390, 600, 768, 820, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Admin overflows at ${width}px`,
    );
    const tableFits = await page
      .locator(".admin-table")
      .evaluate((e) => e.scrollWidth <= e.clientWidth + 1);
    assert(
      tableFits,
      `Product actions require horizontal scroll at ${width}px`,
    );
    for (const action of await page
      .getByRole("button", { name: /^(Editar|Excluir) Camisa SSR$/ })
      .all()) {
      const rect = await action.boundingBox();
      assert(
        rect && rect.x >= 0 && rect.x + rect.width <= width,
        `Action clipped at ${width}px`,
      );
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const anonymous = await fetch(`${origin}/admin`);
  assert(
    !(await anonymous.text()).includes("Camisa SSR"),
    "Private DTO leaked across sessions",
  );
  await page.getByRole("button", { name: "Editar Camisa SSR" }).click();
  await page.getByRole("heading", { name: "Editar ABCD23" }).waitFor();
  assert(
    await page.getByRole("checkbox", { name: "M", exact: true }).isChecked(),
    "SSR editor lost selected filters",
  );
  assert(
    (await page
      .getByLabel("Outras imagens da galeria (HTTPS)")
      .inputValue()) === "https://example.com/back.jpg",
    "Editor dropped existing gallery",
  );
  for (const width of [320, 390, 600, 768, 820, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Product editor overflows at ${width}px`,
    );
    await page.screenshot({
      path: `.harness/admin/editor-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "+ Novo produto" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Produto criado");
  await page
    .getByLabel("Link de destino (HTTPS)")
    .fill("https://example.com/product");
  await page
    .getByLabel("URL da imagem (HTTPS)")
    .fill("https://example.com/image.jpg");
  await page
    .getByLabel("Outras imagens da galeria (HTTPS)")
    .fill("https://example.com/second.jpg\nhttps://example.com/third.jpg");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await page.getByText("Produto criado", { exact: true }).waitFor();
  assert(
    products.find((p) => p.name === "Produto criado")?.imageUrls.length === 3,
    "Admin failed to save complete gallery",
  );
  await page.screenshot({ path: ".harness/admin/desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Filtros", exact: true }).click();
  await page.getByRole("heading", { name: "Filtros do catálogo" }).waitFor();
  assert(
    new URL(page.url()).pathname === "/admin/filters",
    "Filters must use a route",
  );
  assert(
    (await page
      .getByRole("navigation", { name: "Breadcrumb", exact: true })
      .getByRole("link", { name: "Filtros", exact: true })
      .getAttribute("aria-current")) === "page",
    "Breadcrumb identifies current section",
  );
  assert(
    await page
      .getByRole("navigation", { name: "Seções do admin" })
      .getByRole("button", { name: "Filtros", exact: true })
      .isDisabled(),
    "Current filters route must be disabled",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const optionTrigger = page.getByRole("button", {
    name: "Excluir opção M",
    exact: true,
  });
  await optionTrigger.click();
  const confirmation = page.getByRole("dialog", {
    name: "Excluir a opção “M”?",
  });
  await confirmation.waitFor();
  assert(
    await confirmation
      .getByRole("button", { name: "Cancelar", exact: true })
      .evaluate((element) => element === document.activeElement),
    "Modal focuses safe cancel action",
  );
  await page.screenshot({ path: ".harness/admin/delete-option-modal.png" });
  await page.keyboard.press("Escape");
  await confirmation.waitFor({ state: "detached" });
  assert(
    await optionTrigger.evaluate(
      (element) => element === document.activeElement,
    ),
    "Modal restores trigger focus",
  );
  await optionTrigger.click();
  await confirmation
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await confirmation.waitFor({ state: "detached" });
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Filters overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("link", { name: "Outfits", exact: true }).click();
  await page.getByRole("heading", { name: "Outfits", exact: true }).waitFor();
  assert(new URL(page.url()).pathname === "/admin/outfits", "Outfits route");
  assert(
    await page
      .getByRole("navigation", { name: "Seções do admin" })
      .getByRole("button", { name: "Outfits", exact: true })
      .isDisabled(),
    "Current outfits route must be disabled",
  );
  await page.getByLabel("Nome", { exact: true }).fill("Look teste");
  await page.getByLabel("Códigos dos produtos").fill("ABCD23");
  await page.getByRole("button", { name: "Criar outfit", exact: true }).click();
  await page.getByText("LOOK23", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".harness/admin/mobile.png", fullPage: true });
  assert(
    !(await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )),
    "Mobile overflow",
  );
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Fechar menu", exact: true })
    .press("Escape");
  assert(
    (await page
      .getByRole("button", { name: "Abrir menu", exact: true })
      .getAttribute("aria-expanded")) === "false",
    "Escape closes mobile menu",
  );
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByRole("button", { name: "Entrar", exact: true }).waitFor();
  assert(
    clientReads.length === 0,
    `Browser performed initial/data GETs: ${clientReads}`,
  );
  assert(errors.length === 0, `Browser errors: ${errors}`);
  console.log(
    "PASS: static BH loader, hero transition, SSR filters/pagination, session, editor, product creation, filters, outfits, mobile, logout; no browser API GETs.",
  );
  unavailable = true;
  await page.goto(origin);
  await page
    .getByText("Não foi possível carregar os dados. Tente novamente.", {
      exact: true,
    })
    .waitFor();
  assert(
    await page
      .getByRole("button", { name: "Tentar novamente", exact: true })
      .isVisible(),
    "API error has no retry",
  );
  unavailable = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await page.getByText("Camisa SSR", { exact: true }).waitFor();
  console.log("PASS: API failure resolves loader and SSR retry recovers.");
  const reduced = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(origin, { waitUntil: "commit" });
  await reducedPage.locator("[data-brand-loader]").waitFor();
  const mobileLoaderTop = await reducedPage
    .locator("[data-brand-loader] p")
    .evaluate((element) => element.getBoundingClientRect().top);
  await sleep(300);
  assert(
    (await reducedPage.locator("[data-brand-loader] p span").count()) === 0,
    "Reduced motion still splits/animates text",
  );
  await reducedPage.getByText("Camisa SSR", { exact: true }).waitFor();
  const mobileHeroTop = await reducedPage
    .locator("#hero-title")
    .evaluate((element) => element.getBoundingClientRect().top);
  assert(
    Math.abs(mobileLoaderTop - mobileHeroTop) < 1,
    `Mobile loader Y ${mobileLoaderTop} differs from hero Y ${mobileHeroTop}`,
  );
  console.log(`PASS: mobile loader and hero align at Y=${mobileHeroTop}px.`);
  await reduced.close();
  console.log("PASS: reduced motion remains static.");
} catch (error) {
  if (browser) {
    const pages = browser.contexts().flatMap((context) => context.pages());
    for (let i = 0; i < pages.length; i++) {
      console.log("Failed page", pages[i].url());
      await pages[i]
        .screenshot({ path: `.harness/admin/failure-${i}.png`, fullPage: true })
        .catch(() => {});
    }
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
  api.stop(true);
}
