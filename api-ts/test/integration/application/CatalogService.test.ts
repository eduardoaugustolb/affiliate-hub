import { describe, expect, it, mock, spyOn } from "bun:test";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { catalogRepository } from "@test/support/fixtures/catalogRepository";
import type { FilterCategory } from "@/application/CatalogRepository";
import { CatalogService } from "@/application/CatalogService";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";

async function setup() {
	const session = await authenticatedSession();
	const { repository, categories } = catalogRepository();
	const cache = {
		read: mock(async (load: () => Promise<FilterCategory[]>) => load()),
		invalidate: mock(async () => {}),
	};
	return {
		...session,
		repository,
		categories,
		cache,
		service: new CatalogService(repository, session.authenticator, cache),
	};
}
describe("CatalogService", () => {
	it("lists fixed categories publicly through cache", async () => {
		const { service, cache, categories } = await setup();
		expect(await service.listCategories()).toEqual(categories);
		expect(cache.read).toHaveBeenCalledTimes(1);
	});
	it("normalizes names and codes and replaces or clears options", async () => {
		const { service, repository, actor } = await setup();
		await service.createOption(actor, "size", " P ");
		expect(repository.createOption).toHaveBeenCalledWith("size", "P");
		expect(
			await service.createOutfit(actor, " Look ", ["abcd", "ABCD", "efgh"]),
		).toMatchObject({ name: "Look", productCodes: ["ABCD", "EFGH"] });
		await service.setProductOptions(actor, " abcd ", ["one", "one"]);
		expect(repository.setProductOptions).toHaveBeenCalledWith("ABCD", ["one"]);
		await service.setProductOptions(actor, "ABCD", []);
		expect(repository.setProductOptions).toHaveBeenLastCalledWith("ABCD", []);
	});
	it.each(["style", "marketplace", "name", ""])(
		"rejects configurable options for %s",
		async (category) => {
			const { service, repository, actor } = await setup();
			expect(
				service.createOption(actor, category, "Blue"),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(repository.createOption).not.toHaveBeenCalled();
		},
	);
	it.each([null, "", "  ", 123, "a".repeat(161)])(
		"rejects invalid option name %j",
		async (name) => {
			const { service, repository, actor } = await setup();
			expect(service.createOption(actor, "size", name)).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(repository.createOption).not.toHaveBeenCalled();
		},
	);
	it.each([[], null, "ABCD", [1], [""], Array(101).fill("ABCD")])(
		"rejects invalid outfit items",
		async (codes) => {
			const { service, repository, actor } = await setup();
			expect(service.createOutfit(actor, "Look", codes)).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(repository.createOutfit).not.toHaveBeenCalled();
		},
	);
	it("invalidates after successful option changes only", async () => {
		const { service, repository, cache, actor } = await setup();
		await service.createOption(actor, "color", "Blue");
		await service.removeOption(actor, "option");
		expect(cache.invalidate).toHaveBeenCalledTimes(2);
		spyOn(repository, "createOption").mockRejectedValue(
			new BadRequestError("duplicate"),
		);
		expect(service.createOption(actor, "color", "Blue")).rejects.toBeInstanceOf(
			BadRequestError,
		);
		expect(cache.invalidate).toHaveBeenCalledTimes(2);
	});
	const actions = [
		(s: CatalogService, a: { sessionToken: string }) =>
			s.getProductOptions(a, "ABCD"),
		(s: CatalogService, a: { sessionToken: string }) =>
			s.createOption(a, "size", "P"),
		(s: CatalogService, a: { sessionToken: string }) => s.removeOption(a, "id"),
		(s: CatalogService, a: { sessionToken: string }) =>
			s.setProductOptions(a, "ABCD", []),
		(s: CatalogService, a: { sessionToken: string }) =>
			s.createOutfit(a, "Look", ["ABCD"]),
		(s: CatalogService, a: { sessionToken: string }) =>
			s.getOutfit(a, "OUT-AAAAAAAAAAAAAAAA"),
		(s: CatalogService, a: { sessionToken: string }) =>
			s.removeOutfit(a, "OUT-AAAAAAAAAAAAAAAA"),
	];
	for (const action of actions)
		it("requires admin before touching storage", async () => {
			const { service, actor, authenticator, user, repository } = await setup();
			expect(
				action(service, { sessionToken: "invalid" }),
			).rejects.toBeInstanceOf(InvalidCredentialsError);
			spyOn(authenticator, "authenticate").mockResolvedValue(user);
			spyOn(user, "getRole").mockReturnValue("user");
			expect(action(service, actor)).rejects.toBeInstanceOf(
				ForbiddenOperationError,
			);
			for (const method of Object.values(repository))
				expect(method).not.toHaveBeenCalled();
		});
});
