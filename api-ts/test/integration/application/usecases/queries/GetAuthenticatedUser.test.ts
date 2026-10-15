import { beforeEach, describe, expect, it } from "bun:test";
import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { SessionRepositoryFake } from "@test/support/fakes/SessionRepositoryFake";
import { UserRepositoryFake } from "@test/support/fakes/UserRepositoryFake";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import type { IdGenerator } from "@/application/IdGenerator";
import type { SessionRepository } from "@/application/repositories/SessionRepository";
import type { UserRepository } from "@/application/repositories/UserRepository";
import { GetAuthenticatedUser } from "@/application/usecases/queries/GetAuthenticatedUser";
import { Session } from "@/domain/entities/Session";
import { User } from "@/domain/entities/User";
import type { DateProvider } from "@/infra/DateProvider";

describe("GetAuthenticatedUser use case", () => {
	let idGenerator: IdGenerator;
	let dateProvider: DateProvider;
	let userRepo: UserRepository;
	let sessionRepo: SessionRepository;
	let usecase: GetAuthenticatedUser;
	const now = new Date("2026-10-11T12:00:00Z");
	beforeEach(() => {
		idGenerator = new IdGeneratorFake();
		dateProvider = {
			now: () => now,
			add: (ms: number) => new Date(now.getTime() + ms),
		};
		userRepo = new UserRepositoryFake(idGenerator);
		sessionRepo = new SessionRepositoryFake(idGenerator, dateProvider);
		usecase = new GetAuthenticatedUser(userRepo, sessionRepo, dateProvider);
	});

	it("returns the user associated with a valid session", async () => {
		const user = User.create("Alice", "alice@example.com", "hash", "admin");
		await userRepo.save(user);
		const savedUser = await userRepo.findByEmail("alice@example.com");
		if (!savedUser) throw new Error("Expected saved user to be found");

		const session = Session.create(
			dateProvider.add(60_000),
			savedUser.getId(),
			"token-hash",
			dateProvider,
		);
		await sessionRepo.save(session);

		expect(
			usecase.execute({ sessionTokenHash: "token-hash" }),
		).resolves.toEqual({
			id: savedUser.getId(),
			name: "Alice",
			email: "alice@example.com",
			role: "admin",
		});
	});

	it("rejects a session token that does not exist", () => {
		return expect(
			usecase.execute({ sessionTokenHash: "unknown-token" }),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("rejects an empty session token without querying the repository", async () => {
		const findByTokenHash = sessionRepo.findByTokenHash.bind(sessionRepo);
		let wasQueried = false;
		sessionRepo.findByTokenHash = async (tokenHash) => {
			wasQueried = true;
			return findByTokenHash(tokenHash);
		};

		expect(usecase.execute({ sessionTokenHash: "  " })).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
		expect(wasQueried).toBe(false);
	});

	it("rejects a session whose user no longer exists", async () => {
		await sessionRepo.save(
			Session.create(
				dateProvider.add(60_000),
				"missing-user-id",
				"orphaned-token",
				dateProvider,
			),
		);

		expect(
			usecase.execute({ sessionTokenHash: "orphaned-token" }),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});
});

describe("GetAuthenticatedUser expired sessions", () => {
	it("returns InvalidCredentialsError when an expired session cannot be rehydrated", async () => {
		let now = new Date("2026-10-11T12:00:00Z");
		const dateProvider = {
			now: () => now,
			add: (ms: number) => new Date(now.getTime() + ms),
		};
		const generator = new IdGeneratorFake();
		const userRepo = new UserRepositoryFake(generator);
		const sessionRepo = new SessionRepositoryFake(generator, dateProvider);
		await sessionRepo.save(
			Session.create(
				dateProvider.add(60_000),
				"user-id",
				"expired-token",
				dateProvider,
			),
		);
		now = dateProvider.add(120_000);
		const usecase = new GetAuthenticatedUser(
			userRepo,
			sessionRepo,
			dateProvider,
		);
		expect(
			usecase.execute({ sessionTokenHash: "expired-token" }),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});
});
