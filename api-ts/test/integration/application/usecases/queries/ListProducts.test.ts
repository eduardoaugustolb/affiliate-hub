import { describe, expect, it, spyOn } from "bun:test";
import { ProductDAOFake } from "@test/support/fakes/ProductDAOFake";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { productFake } from "@test/support/fixtures/productFake";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ListProducts } from "@/application/usecases/queries/ListProducts";

describe("ListProducts", () => {
	async function setup() {
		const session = await authenticatedSession();
		const repo = new ProductDAOFake();
		const query = new ListProducts(repo, session.authenticator);
		return { ...session, repo, query };
	}
	it("returns a bounded page including inactive products", async () => {
		const { repo, query, actor } = await setup();
		for (const [code, status] of [
			["AAAA", "active"],
			["BBBB", "inactive"],
			["CCCC", "active"],
		] as const)
			await repo.save({ ...productFake, id: code, code, status });
		const result = await query.execute(actor, { limit: 1, offset: 1 });
		expect(result.map((product) => product.code)).toEqual(["BBBB"]);
	});
	it.each([
		{ limit: 0, offset: 0 },
		{ limit: 101, offset: 0 },
		{ limit: 1, offset: -1 },
		{ limit: 1.5, offset: 0 },
		{ limit: 1, offset: NaN },
	])("rejects invalid pagination: %j", async (input) => {
		const { repo, query, actor } = await setup();
		const list = spyOn(repo, "list");
		expect(query.execute(actor, input)).rejects.toBeInstanceOf(BadRequestError);
		// Rejection assertion registers with Bun; no product lookup is permitted.
		expect(list).not.toHaveBeenCalled();
	});
	it("requires a session", async () => {
		const { query } = await setup();
		expect(
			query.execute({ sessionToken: "unknown" }, { limit: 25, offset: 0 }),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});
	it("requires admin permission", async () => {
		const { query, actor, user, authenticator } = await setup();
		spyOn(authenticator, "authenticate").mockResolvedValue(user);
		spyOn(user, "getRole").mockReturnValue("user");
		expect(
			query.execute(actor, { limit: 25, offset: 0 }),
		).rejects.toBeInstanceOf(ForbiddenOperationError);
	});
});
