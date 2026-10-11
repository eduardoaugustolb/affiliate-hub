import { describe, expect, it } from "bun:test";
import { AuthenticateUser } from "@/application/usecases/AuthenticateUser";
import { CreateProduct } from "@/application/usecases/CreateProduct";
import { GetProductByCode } from "@/application/usecases/GetProductByCode";
import { Product } from "@/domain/entities/Product";
import { User } from "@/domain/entities/User";
import { BunTokenGenerator } from "@/external/BunTokenGenerator";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import { BunSessionTokenHasher } from "@/external/hash/BunSessionTokenHasher";
import { RuntimeDateProvider } from "@/infra/date/providers/RuntimeDateProvider";
import { IdGeneratorFake } from "../mocks/IdGeneratorFake";
import { ProductCodeGeneratorFake } from "../mocks/ProductCodeGeneratorFake";
import { ProductRepositoryFake } from "../mocks/ProductRepositoryFake";
import { SessionRepositoryFake } from "../mocks/SessionRepositoryFake";
import { UserRepositoryFake } from "../mocks/UserRepositoryFake";

describe("application use case integrations", () => {
	it("creates a product and retrieves it through the repository", async () => {
		const repo = new ProductRepositoryFake(new IdGeneratorFake());
		const create = new CreateProduct(repo, new ProductCodeGeneratorFake());
		const get = new GetProductByCode(repo);
		await create.execute({
			destinationUrl: "https://example.com/item",
			marketplace: "shein",
			imageUrl: "https://example.com/item.jpg",
			status: "active",
		});
		const found = await get.execute(undefined, { code: "ABC123" });
		expect(found).toBeInstanceOf(Product);
		expect(found?.getDestinationUrl()).toBe("https://example.com/item");
	});

	it("authenticates, persists a session, and resolves it by hashed token", async () => {
		const ids = new IdGeneratorFake();
		const dateProvider = new RuntimeDateProvider();
		const users = new UserRepositoryFake(ids);
		const sessions = new SessionRepositoryFake(ids, dateProvider);
		const hasher = new BunPasswordHasher();
		await users.save(
			User.create(
				"Integration User",
				"integration@example.com",
				await hasher.hash("secret"),
				"admin",
			),
		);
		const auth = new AuthenticateUser(
			users,
			sessions,
			dateProvider,
			hasher,
			new BunTokenGenerator(),
			new BunSessionTokenHasher(),
		);
		const tokenHash = await auth.execute(undefined, {
			email: "integration@example.com",
			password: "secret",
		});
		const session = await sessions.findByTokenHash(tokenHash);
		expect(session?.getTokenHash()).toBe(tokenHash);
		expect(session?.getUserId()).toBeTruthy();
		expect(session?.getExpiresAt().getTime()).toBeGreaterThan(Date.now());
	});
});
