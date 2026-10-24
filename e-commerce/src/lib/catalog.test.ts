import { describe, expect, test } from "bun:test";
import { searchQuery } from "./catalog";

describe("public catalog query", () => {
  test("omits empty filters and preserves combined selections and pagination", () => {
    const query = new URLSearchParams(
      searchQuery(
        {
          name: "  camisa azul  ",
          productCode: "",
          outfitCode: "   ",
          size: ["size-p", "size-m"],
          color: ["color-blue"],
          marketplace: "shein",
        },
        24,
      ),
    );
    expect(Object.fromEntries(query)).toEqual({
      limit: "24",
      offset: "24",
      name: "camisa azul",
      size: "size-p,size-m",
      color: "color-blue",
      marketplace: "shein",
    });
  });

  test("clearing filters restarts an unfiltered search", () => {
    expect(searchQuery({ size: [], color: [], name: "" })).toBe(
      "limit=24&offset=0",
    );
  });

  test("encodes literal names without introducing query parameters", () => {
    const query = new URLSearchParams(
      searchQuery({ name: "a&marketplace=shopee + %_" }),
    );
    expect(query.get("name")).toBe("a&marketplace=shopee + %_");
    expect(query.has("marketplace")).toBe(false);
  });
});
