import { describe, expect, it } from "bun:test";
import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { SessionRepositoryFake } from "@test/support/fakes/SessionRepositoryFake";
import { UserRepositoryFake } from "@test/support/fakes/UserRepositoryFake";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { AuthenticateUser } from "@/application/usecases/commands/AuthenticateUser";
import { User } from "@/domain/entities/User";

describe("AuthenticateUser", () => {
	const now = new Date("2026-10-11T12:00:00Z");
	function setup() {
		const dateProvider = {
			now: () => now,
			add: (ms: number) => new Date(now.getTime() + ms),
		};
		const idGenerator = new IdGeneratorFake();
		const userRepo = new UserRepositoryFake(idGenerator);
		const sessionRepo = new SessionRepositoryFake(idGenerator, dateProvider);

		const passwordHasher = {
			hash: async (s: string) => `hash:${s}`,
			verify: async (s: string, hash: string) => hash === `hash:${s}`,
		};
		const generator = {
			generate: (bytes: number) => {
				expect(bytes).toBe(32);
				return "raw-token";
			},
		};
		const tokenHasher = { hash: async (s: string) => `token-hash:${s}` };
		const useCase = new AuthenticateUser(
			userRepo,
			sessionRepo,
			dateProvider,
			passwordHasher,
			generator,
			tokenHasher,
		);
		return { useCase, userRepo, sessionRepo };
	}

	it("creates and persists a hashed session on valid credentials", async () => {
		const { useCase, userRepo, sessionRepo } = setup();
		await userRepo.save(
			User.create("Alice", "alice@example.com", "hash:secret", "admin"),
		);
		const result = await useCase.execute(undefined, {
			email: "alice@example.com",
			password: "secret",
		});
		expect(result).toBe("raw-token");
		const session = await sessionRepo.findByTokenHash(`token-hash:${result}`);
		expect(session?.getUserId()).toBeTruthy();
		expect(session?.getExpiresAt()).toEqual(new Date("2026-10-18T12:00:00Z"));
		expect(session?.getRevokedAt()).toBeNull();
	});

	it("rejects an unknown email and does not save a session", () => {
		const { useCase } = setup();
		return expect(
			useCase.execute(undefined, {
				email: "missing@example.com",
				password: "secret",
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("rejects an invalid password", async () => {
		const { useCase, userRepo } = setup();
		await userRepo.save(
			User.create("Alice", "alice@example.com", "hash:secret", "admin"),
		);
		return expect(
			useCase.execute(undefined, {
				email: "alice@example.com",
				password: "wrong",
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});
});
