import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { SessionRepositoryFake } from "@test/support/fakes/SessionRepositoryFake";
import { UserRepositoryFake } from "@test/support/fakes/UserRepositoryFake";
import { dateProvider } from "@test/support/fixtures/dateProvider";
import { SessionAuthenticator } from "@/application/SessionAuthenticator";
import { Session } from "@/domain/entities/Session";
import { User } from "@/domain/entities/User";
export async function authenticatedSession() {
	const generator = new IdGeneratorFake();
	const userRepo = new UserRepositoryFake(generator);
	const sessionRepo = new SessionRepositoryFake(generator, dateProvider);
	const tokenHasher = { hash: async (token: string) => `hashed:${token}` };
	await userRepo.save(
		User.create("Admin", "admin@example.com", "password-hash", "admin"),
	);
	const user = await userRepo.findByEmail("admin@example.com");
	if (!user) throw new Error("Missing test user");
	await sessionRepo.save(
		Session.create(
			dateProvider.add(60000),
			user.getId(),
			await tokenHasher.hash("session-token"),
			dateProvider,
		),
	);
	const authenticator = new SessionAuthenticator(
		userRepo,
		sessionRepo,
		tokenHasher,
		dateProvider,
	);
	return {
		userRepo,
		sessionRepo,
		user,
		authenticator,
		actor: { sessionToken: "session-token" },
	};
}
