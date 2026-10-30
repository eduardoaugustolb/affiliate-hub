import { afterAll, beforeEach, expect, mock, spyOn, test } from "bun:test";

mock.module("server-only", () => ({}));
let token = "";
const stored: { name: string; value: string; options: unknown }[] = [];
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "session" && token ? { value: token } : undefined,
    set: (name: string, value: string, options: unknown) => {
      stored.push({ name, value, options });
      token = value;
    },
  }),
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));
const original = {
  API_URL: process.env.API_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
};
process.env.SESSION_COOKIE_NAME = "session";
let role = "admin";
let writeFailure = 0;
let instagramEnabled = true;
const instagramConfiguration = {
  name: "Looks do post",
  enabled: false,
  source: "comment" as const,
  postUrl: "https://www.instagram.com/p/test/",
  outfits: [{ number: "01", code: "OUT-AAAAAAAAAAAAAAAA" }],
  rules: [
    { triggers: ["quero"], target: "all", privateReply: "{lista_outfits}" },
  ],
};
const requests: {
  path: string;
  method: string;
  cookie: string | null;
  body: unknown;
}[] = [];
const product = {
  id: "private-id",
  code: "ABCD23",
  name: "Camisa",
  marketplace: "shopee",
  destinationUrl: "https://example.com/item",
  imageUrl: "https://example.com/image.jpg",
  status: "active",
  createdAt: "private-date",
  internalSecret: "must-not-leak",
};
const api = Bun.serve({
  port: 0,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const body = req.method === "GET" ? undefined : await req.text();
    requests.push({
      path,
      method: req.method,
      cookie: req.headers.get("cookie"),
      body: body ? JSON.parse(body) : undefined,
    });
    if (path === "/integrations/instagram/status")
      return instagramEnabled
        ? Response.json({
            configured: true,
            username: "blackhem",
            accessToken: "must-not-leak",
          })
        : new Response(null, { status: 404 });
    if (path === "/integrations/instagram/campaigns")
      return Response.json([
        {
          id: "looks",
          accountId: "private-id",
          configuration: instagramConfiguration,
          accessToken: "must-not-leak",
        },
      ]);
    if (path === "/integrations/instagram/history")
      return Response.json([
        {
          id: "event",
          type: "send",
          kind: "comment",
          status: "accepted",
          createdAt: "2026-10-24T12:00:00Z",
          message: "must-not-leak",
        },
      ]);
    if (path === "/integrations/instagram/preview")
      return Response.json({
        privateReply: "01 — Look: https://example.com/o/code",
        rule: instagramConfiguration.rules[0],
        accessToken: "must-not-leak",
      });
    if (
      path.startsWith("/integrations/instagram/campaigns/") &&
      req.method === "PUT"
    )
      return Response.json({
        id: "looks",
        configuration: body ? JSON.parse(body) : {},
        accessToken: "must-not-leak",
      });
    if (path === "/storefront/products/ABCD23")
      return Response.json({
        ...product,
        colors: [{ id: "red", name: "Vermelho", secret: "must-not-leak" }],
        sizes: [],
      });
    if (path === "/storefront/outfits/OUT-AAAAAAAAAAAAAAAA")
      return Response.json({
        code: "OUT-AAAAAAAAAAAAAAAA",
        name: "Look",
        products: [{ ...product, colors: [], sizes: [] }],
        secret: "must-not-leak",
      });
    if (path.startsWith("/storefront/"))
      return new Response(null, { status: 404 });
    if (path.startsWith("/products/") && req.method === "PUT" && writeFailure)
      return Response.json(
        {
          code: writeFailure === 422 ? "DOMAIN_ERROR" : "INTERNAL_SERVER_ERROR",
          message: "must-not-leak-private-backend-details",
        },
        { status: writeFailure },
      );
    if (path === "/auth/login")
      return new Response(null, {
        headers: {
          "Set-Cookie":
            "session=fixture; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800",
        },
      });
    if (path === "/auth/me")
      return Response.json({
        name: "Admin",
        role,
        id: "private-user",
        email: "private@example.com",
        passwordHash: "must-not-leak",
      });
    if (path === "/products" && req.method === "GET")
      return Response.json([product]);
    if (path === "/products/ABCD23" && req.method === "GET")
      return Response.json(product);
    if (path.endsWith("/filter-options") && req.method === "GET")
      return Response.json({
        optionIds: ["size-m"],
        internalSecret: "must-not-leak",
      });
    if (path === "/search/filters")
      return Response.json({
        filters: [
          {
            key: "size",
            label: "Tamanho",
            type: "choices",
            multiple: true,
            choices: [{ value: "size-m", label: "M", secret: "must-not-leak" }],
            secret: "must-not-leak",
          },
        ],
        secret: "must-not-leak",
      });
    if (path === "/search")
      return Response.json({
        items: [product],
        limit: 24,
        offset: 0,
        hasMore: false,
        secret: "must-not-leak",
      });
    if (path === "/outfits" || path.startsWith("/outfits/"))
      return Response.json({
        code: "LOOK23",
        name: "Look",
        productCodes: ["ABCD23"],
        secret: "must-not-leak",
      });
    return new Response(null, { status: 204 });
  },
});
process.env.API_URL = api.url.origin;
// Import after mock registration so Next's server-only modules use the test doubles.
// These are eager test-setup imports, not lazy loading in production code.
const auth = await import("../src/data/auth");
const products = await import("../src/data/products");
const catalog = await import("../src/data/catalog");
const entries = await import("../src/data/entries");
const actions = await import("../src/app/admin/actions");
const instagram = await import("../src/data/instagram");
const instagramActions = await import("../src/app/admin/instagram-actions");
beforeEach(() => {
  token = "";
  role = "admin";
  writeFailure = 0;
  instagramEnabled = true;
  requests.length = 0;
  stored.length = 0;
});
afterAll(() => {
  api.stop(true);
  for (const key of ["API_URL", "SESSION_COOKIE_NAME"] as const) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});
const protectedOperations = [
  () => products.listProducts(),
  () => products.getProduct("ABCD23"),
  () => products.getProductOptions("ABCD23"),
  () => products.saveProduct(null, {}),
  () => products.deleteProduct("ABCD23"),
  () => products.setProductOptions("ABCD23", []),
  () => catalog.getAdminFilters(),
  () => catalog.createOption("size", "M"),
  () => catalog.deleteOption("size-m"),
  () => catalog.getOutfit("LOOK23"),
  () => catalog.createOutfit({}),
  () => catalog.deleteOutfit("LOOK23"),
  () => auth.logout(),
  () => instagram.getInstagramData(),
  () => instagram.saveInstagramCampaign("looks", instagramConfiguration),
  () => instagram.deleteInstagramCampaign("looks"),
  () => instagram.previewInstagramCampaign(instagramConfiguration, "quero"),
];
test("every private DAL entry point rejects anonymous callers before touching the API", async () => {
  for (const operation of protectedOperations)
    await expect(operation()).rejects.toMatchObject({ status: 401 });
  expect(requests).toHaveLength(0);
});
test("every private entry point rejects a non-admin, including direct mutation calls", async () => {
  token = "fixture";
  role = "member";
  for (const operation of protectedOperations)
    await expect(operation()).rejects.toMatchObject({ status: 403 });
  expect(
    requests.every((r) => r.path === "/auth/me" && r.method === "GET"),
  ).toBe(true);
});
test("DTOs discard backend-only fields and session data", async () => {
  token = "fixture";
  expect(await auth.requireAdmin()).toEqual({ name: "Admin" });
  const items = await products.listProducts();
  expect(Object.keys(items[0]).sort()).toEqual([
    "code",
    "destinationUrl",
    "imageUrl",
    "imageUrls",
    "marketplace",
    "name",
    "status",
  ]);
  expect(JSON.stringify(items)).not.toContain("must-not-leak");
  const search = await catalog.searchProducts({});
  expect(Object.keys(search.items[0]).sort()).toEqual([
    "code",
    "imageUrl",
    "marketplace",
    "name",
  ]);
  expect(JSON.stringify(await catalog.getFilters())).not.toContain(
    "must-not-leak",
  );
  expect(
    await catalog.createOutfit({ name: "Look", productCodes: ["ABCD23"] }),
  ).toEqual({ code: "LOOK23" });
});
test("public reads never send a visitor session to the backend", async () => {
  token = "fixture";
  await catalog.searchProducts({});
  await catalog.getFilters();
  expect(requests.every((r) => r.cookie === null)).toBe(true);
});
test("private requests forward only the selected session cookie", async () => {
  token = "fixture";
  await products.getProduct("ABCD23");
  expect(requests.every((r) => r.cookie === "session=fixture")).toBe(true);
});
test("mutation inputs are checked server-side before backend writes", async () => {
  token = "fixture";
  await expect(products.deleteProduct("../auth")).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    products.saveProduct(null, {
      ...product,
      destinationUrl: "javascript:alert(1)",
      optionIds: [],
    }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    products.setProductOptions("ABCD23", ["../bad"]),
  ).rejects.toMatchObject({ status: 400 });
  await expect(catalog.createOption("unknown", "M")).rejects.toMatchObject({
    status: 400,
  });
  expect(requests.every((r) => r.method === "GET")).toBe(true);
});
test("mutations allowlist fields rather than forwarding client privilege claims", async () => {
  token = "fixture";
  await products.saveProduct(null, {
    ...product,
    optionIds: ["size-m"],
    role: "admin",
    sessionToken: "injected",
  });
  const write = requests.find(
    (r) => r.path === "/products" && r.method === "POST",
  );
  expect(write?.body).toEqual({
    name: "Camisa",
    marketplace: "shopee",
    destinationUrl: "https://example.com/item",
    imageUrl: "https://example.com/image.jpg",
    imageUrls: ["https://example.com/image.jpg"],
    status: "active",
    optionIds: ["size-m"],
  });
});
test("login validates the authenticated role before storing an HttpOnly cookie", async () => {
  await auth.login({ email: "admin@example.com", password: "fixture" });
  expect(stored[0]).toMatchObject({
    name: "session",
    value: "fixture",
    options: { httpOnly: true, path: "/", sameSite: "strict", maxAge: 604800 },
  });
  expect(JSON.stringify(await auth.requireAdmin())).not.toContain("fixture");
});
test("a non-admin login never stores the cookie and revokes the new session", async () => {
  role = "member";
  await expect(
    auth.login({ email: "member@example.com", password: "fixture" }),
  ).rejects.toMatchObject({ status: 403 });
  expect(stored).toHaveLength(0);
  expect(requests.some((r) => r.path === "/auth/logout")).toBe(true);
});
test("Server Actions authorize direct calls and return safe error results", async () => {
  expect(await actions.deleteProductAction("ABCD23")).toMatchObject({
    ok: false,
    status: 401,
  });
  token = "fixture";
  role = "member";
  expect(
    await actions.saveProductAction(null, { ...product, optionIds: [] }),
  ).toMatchObject({ ok: false, status: 403 });
  expect(requests.every((r) => r.method === "GET")).toBe(true);
});

test("malformed session cookies never become forwarded headers", async () => {
  token = "fixture; other=forged";
  await expect(products.listProducts()).rejects.toMatchObject({ status: 401 });
  expect(requests).toHaveLength(0);
});

test("public detail DAL strips private fields and never forwards a visitor session", async () => {
  token = "fixture";
  const product = await entries.getPublicProduct("abcd23");
  const outfit = await entries.getPublicOutfit("OUT-AAAAAAAAAAAAAAAA");
  expect(product?.colors).toEqual([{ id: "red", name: "Vermelho" }]);
  for (const result of [product, outfit]) {
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
    expect(JSON.stringify(result)).not.toContain("private-id");
  }
  expect(requests.every((r) => !r.cookie)).toBe(true);
});
test("public detail DAL handles unknown and malformed identifiers without exposing errors", async () => {
  expect(await entries.getPublicProduct("ZZZZ")).toBeNull();
  expect(await entries.getPublicProduct("../auth")).toBeNull();
  expect(await entries.getPublicOutfit("OUT-BBBBBBBBBBBBBBBB")).toBeNull();
  expect(requests.some((r) => r.path.includes("auth"))).toBe(false);
});

test("gallery DTO preserves order, deduplicates, derives cover and supports legacy imageUrl", () => {
  const photos = [
    "https://example.com/front.jpg",
    "https://example.com/back.jpg",
  ];
  const detail = entries.productDetailDTO({
    ...product,
    imageUrls: [...photos, photos[0]],
    colors: [
      { id: "red", name: "Vermelho" },
      { id: "blue", name: "Azul" },
    ],
    sizes: [],
  });
  expect(detail.imageUrls).toEqual(photos);
  expect(detail.imageUrl).toBe(photos[0]);
  expect(detail.colors).toHaveLength(2);
  expect(
    entries.productDetailDTO({ ...product, colors: [], sizes: [] }).imageUrls,
  ).toEqual([product.imageUrl]);
});
test("gallery validates the 20 HTTPS image limit before saving", async () => {
  token = "fixture";
  for (const imageUrls of [
    [],
    ["http://example.com/insecure.jpg"],
    ["https://user:pass@example.com/a.jpg"],
    Array.from({ length: 21 }, (_, i) => `https://example.com/${i}.jpg`),
  ]) {
    await expect(
      products.saveProduct(null, { ...product, imageUrls, optionIds: [] }),
    ).rejects.toMatchObject({ status: 400 });
  }
  expect(requests.some((r) => r.method !== "GET")).toBe(false);
  const imageUrls = Array.from(
    { length: 20 },
    (_, i) => `https://example.com/${i}.jpg`,
  );
  await products.saveProduct("ABCD23", {
    ...product,
    imageUrls,
    optionIds: ["red", "blue"],
  });
  expect(requests.find((r) => r.method === "PUT")?.body).toMatchObject({
    imageUrl: imageUrls[0],
    imageUrls,
    optionIds: ["red", "blue"],
  });
});

test("mutation failures preserve API status and log safe diagnostics without backend details or session", async () => {
  token = "fixture";
  const log = spyOn(console, "error").mockImplementation(() => {});
  try {
    for (const status of [422, 500]) {
      writeFailure = status;
      const result = await actions.saveProductAction("ABCD23", {
        ...product,
        optionIds: [],
      });
      expect(result).toMatchObject({ ok: false, status });
      if (!result.ok) expect(result.message).toContain(`HTTP ${status}`);
    }
    const diagnostics = JSON.stringify(log.mock.calls);
    expect(diagnostics).toContain("DOMAIN_ERROR");
    expect(diagnostics).toContain("INTERNAL_SERVER_ERROR");
    expect(diagnostics).not.toContain("must-not-leak");
    expect(diagnostics).not.toContain("fixture");
    expect(diagnostics).not.toContain("session=");
  } finally {
    log.mockRestore();
  }
});

test("Instagram private DTOs strip provider credentials and raw payloads while forwarding only the session", async () => {
  token = "fixture";
  const page = await instagram.getInstagramData();
  expect(page.configured).toBe(true);
  expect(page.campaigns).toHaveLength(1);
  expect(page.history).toHaveLength(1);
  expect(JSON.stringify(page)).not.toContain("must-not-leak");
  expect(JSON.stringify(page)).not.toContain("private-id");
  const preview = await instagram.previewInstagramCampaign(
    instagramConfiguration,
    "quero",
  );
  expect(preview).toEqual({
    matched: true,
    privateReply: "01 — Look: https://example.com/o/code",
  });
  const saved = await instagram.saveInstagramCampaign("looks", {
    ...instagramConfiguration,
    accessToken: "injected",
    accountId: "forged",
  });
  expect(Object.keys(saved).sort()).toEqual(["configuration", "id"]);
  expect(JSON.stringify(saved)).not.toContain("must-not-leak");
  const write = requests.find((request) => request.method === "PUT");
  expect(write?.body).toEqual(instagramConfiguration);
  expect(
    requests.every((request) => request.cookie === "session=fixture"),
  ).toBe(true);
});

test("disabled Instagram integration returns a safe unavailable state without fetching campaigns or history", async () => {
  token = "fixture";
  instagramEnabled = false;
  const page = await instagram.getInstagramData();
  expect(page).toEqual({
    configured: false,
    username: "",
    campaigns: [],
    history: [],
    error: "",
  });
  expect(
    requests.some(
      (request) =>
        request.path.endsWith("/campaigns") ||
        request.path.endsWith("/history"),
    ),
  ).toBe(false);
});

test("Instagram invalid rules and post destinations never reach the API", async () => {
  token = "fixture";
  for (const input of [
    { ...instagramConfiguration, postUrl: "https://evil.example/p/test/" },
    {
      ...instagramConfiguration,
      rules: [
        ...instagramConfiguration.rules,
        { ...instagramConfiguration.rules[0], triggers: [" QUERO "] },
      ],
    },
    {
      ...instagramConfiguration,
      rules: [{ triggers: ["quero"], target: "all", privateReply: "{url}" }],
    },
    {
      ...instagramConfiguration,
      source: "message",
      postUrl: null,
      rules: [{ triggers: ["quero"], target: "all", publicReply: "Olá" }],
    },
    {
      ...instagramConfiguration,
      rules: [
        { triggers: ["quero"], target: "all", privateReply: "á".repeat(501) },
      ],
    },
  ])
    await expect(
      instagram.saveInstagramCampaign("looks", input),
    ).rejects.toMatchObject({ status: 400 });
  expect(requests.every((request) => request.path === "/auth/me")).toBe(true);
});

test("Instagram Server Actions authorize direct preview and mutation calls", async () => {
  expect(
    await instagramActions.saveInstagramCampaignAction(
      "looks",
      instagramConfiguration,
    ),
  ).toMatchObject({ ok: false, status: 401 });
  expect(
    await instagramActions.previewInstagramCampaignAction(
      instagramConfiguration,
      "quero",
    ),
  ).toMatchObject({ ok: false, status: 401 });
  expect(
    await instagramActions.deleteInstagramCampaignAction("looks"),
  ).toMatchObject({ ok: false, status: 401 });
  expect(requests).toHaveLength(0);
});
