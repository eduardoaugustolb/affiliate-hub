import { expect, it } from "bun:test";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { productOptionIds } from "@/application/ProductOptionIds";

it("preserves omitted options, supports clearing and deduplicates normalized UUIDs", () => {
	expect(productOptionIds(undefined)).toBeUndefined();
	expect(productOptionIds([])).toEqual([]);
	const id = crypto.randomUUID();
	expect(productOptionIds([id, id.toUpperCase()])).toEqual([id]);
});
it.each([null, "id", [1], ["bad"], Array(101).fill(crypto.randomUUID())])(
	"rejects invalid option identifiers",
	(value) => {
		expect(() => productOptionIds(value)).toThrow(BadRequestError);
	},
);
