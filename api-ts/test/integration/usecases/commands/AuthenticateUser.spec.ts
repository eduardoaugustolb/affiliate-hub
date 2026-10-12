import { describe, expect, it } from "bun:test";
import { AuthenticateUser } from "@/application/usecases/commands/AuthenticateUser";
import { User } from "@/domain/entities/User";
import { BunTokenGenerator } from "@/external/BunTokenGenerator";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import { BunSessionTokenHasher } from "@/external/hash/BunSessionTokenHasher";
import { RuntimeDateProvider } from "@/infra/date/providers/RuntimeDateProvider";
import { IdGeneratorFake } from "../../../../test/unit/mocks/IdGeneratorFake";
import { SessionRepositoryFake } from "../../../../test/unit/mocks/SessionRepositoryFake";
import { UserRepositoryFake } from "../../../../test/unit/mocks/UserRepositoryFake";

describe("AuthenticateUser integration", () => {
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
