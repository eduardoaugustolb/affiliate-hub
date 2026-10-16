import { describe, expect, it, spyOn } from "bun:test";
import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { ProductRepositoryFake } from "@test/support/fakes/ProductRepositoryFake";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { dateProvider } from "@test/support/fixtures/dateProvider";
import { productFake } from "@test/support/fixtures/productFake";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { UpdateProduct } from "@/application/usecases/commands/UpdateProduct";
import { Product } from "@/domain/entities/Product";
import { Session } from "@/domain/entities/Session";
import { DomainError } from "@/domain/errors/DomainError";

describe("UpdateProduct", () => {
	async function setup() {
		const session = await authenticatedSession();
		const repo = new ProductRepositoryFake(new IdGeneratorFake());
		await repo.save(
			Product.rehydrate(
				productFake.id,
				productFake.code,
				productFake.destinationUrl,
				productFake.marketplace,
				productFake.imageUrl,
				productFake.status,
			),
		);
		const original = await repo.findByCode(productFake.code);
		if (!original) throw new Error("Missing product fixture");
		const input = {
			code: productFake.code,
			destinationUrl: "https://example.com/updated",
			marketplace: "shopee",
			imageUrl: "https://example.com/updated.jpg",
			status: "inactive",
		};
		const command = new UpdateProduct(repo, session.authenticator);
		return { ...session, repo, original, input, command };
	}
	it("updates all editable fields and preserves identity", async () => {
		const { actor, repo, original, input, command } = await setup();
		expect(
			await command.execute(actor, {
				...input,
				code: `  ${input.code}  `,
			}),
		).toBeUndefined();
		const product = await repo.findByCode(input.code);
		expect(product?.getId()).toBe(original.getId());
		expect(product?.getCode()).toBe(productFake.code);
		expect(product?.getDestinationUrl()).toBe(input.destinationUrl);
		expect(product?.getMarketplace()).toBe(input.marketplace);
		expect(product?.getImageUrl()).toBe(input.imageUrl);
		expect(product?.getStatus()).toBe(input.status);
	});
	it.each(["", "  ", "unknown"])(
		"rejects an invalid session: %j",
		async (sessionToken) => {
			const { repo, input, command } = await setup();
			const find = spyOn(repo, "findByCode");
			const mutate = spyOn(repo, "update");
			try {
				await command.execute({ sessionToken }, input);
				throw new Error("Expected rejection");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidCredentialsError);
			}
			expect(find).not.toHaveBeenCalled();
			expect(mutate).not.toHaveBeenCalled();
		},
	);
	it.each(["expired", "revoked"])(
		"rejects a %s session before accessing products",
		async (state) => {
			const { actor, user, sessionRepo, repo, input, command } = await setup();
			const session = Session.rehydrate(
				"session-id",
				dateProvider.add(60000),
				state === "revoked" ? dateProvider.now() : null,
				user.getId(),
				"hashed:session-token",
				dateProvider,
			);
			if (state === "expired")
				spyOn(session, "getExpiresAt").mockReturnValue(dateProvider.now());
			spyOn(sessionRepo, "findByTokenHash").mockResolvedValue(session);
			const find = spyOn(repo, "findByCode");
			const mutate = spyOn(repo, "update");
			try {
				await command.execute(actor, input);
				throw new Error("Expected rejection");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidCredentialsError);
			}
			expect(find).not.toHaveBeenCalled();
			expect(mutate).not.toHaveBeenCalled();
		},
	);
	it("rejects a non-admin before accessing products", async () => {
		const { actor, user, authenticator, repo, input, command } = await setup();
		spyOn(authenticator, "authenticate").mockResolvedValue(user);
		spyOn(user, "getRole").mockReturnValue("user");
		const find = spyOn(repo, "findByCode");
		const mutate = spyOn(repo, "update");
		try {
			await command.execute(actor, input);
			throw new Error("Expected rejection");
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenOperationError);
		}
		expect(find).not.toHaveBeenCalled();
		expect(mutate).not.toHaveBeenCalled();
	});
	it.each(["", "  ", "MISSING"])(
		"rejects a missing product: %j",
		async (code) => {
			const { actor, repo, input, command } = await setup();
			const mutate = spyOn(repo, "update");
			try {
				await command.execute(actor, { ...input, code });
				throw new Error("Expected rejection");
			} catch (error) {
				expect(error).toBeInstanceOf(ProductNotFoundError);
			}
			expect(mutate).not.toHaveBeenCalled();
			expect(await repo.findByCode(productFake.code)).toBeDefined();
		},
	);
	it("propagates repository failures", async () => {
		const { actor, repo, input, command } = await setup();
		const error = new Error("Database unavailable");
		spyOn(repo, "update").mockRejectedValue(error);
		expect(command.execute(actor, input)).rejects.toBe(error);
	});
	it.each([
		["destinationUrl", "http://example.com"],
		["imageUrl", "invalid"],
		["marketplace", "invalid"],
		["status", "invalid"],
	])(
		"rejects invalid %s without changing persisted data",
		async (field, value) => {
			const { actor, repo, input, command } = await setup();
			const mutate = spyOn(repo, "update");
			try {
				await command.execute(actor, { ...input, [field as string]: value });
				throw new Error("Expected rejection");
			} catch (error) {
				expect(error).toBeInstanceOf(DomainError);
			}
			expect(mutate).not.toHaveBeenCalled();
			const product = await repo.findByCode(input.code);
			expect(product?.getDestinationUrl()).toBe(productFake.destinationUrl);
			expect(product?.getImageUrl()).toBe(productFake.imageUrl);
			expect(product?.getMarketplace()).toBe(productFake.marketplace);
			expect(product?.getStatus()).toBe(productFake.status);
		},
	);
});
