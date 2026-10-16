import type { User } from "@/domain/entities/User";
import { DomainError } from "@/domain/errors/DomainError";
import type { DateProvider } from "@/infra/DateProvider";
import { InvalidCredentialsError } from "./errors/InvalidCredentialsError";
import type { SessionRepository } from "./repositories/SessionRepository";
import type { UserRepository } from "./repositories/UserRepository";
import type { SessionTokenHasher } from "./SessionTokenHasher";

export type SessionActor = { sessionToken: string };

export class SessionAuthenticator {
	constructor(
		private readonly userRepo: UserRepository,
		private readonly sessionRepo: SessionRepository,
		private readonly tokenHasher: SessionTokenHasher,
		private readonly dateProvider: DateProvider,
	) {}
	async authenticate(actor: SessionActor): Promise<User> {
		if (!actor.sessionToken.trim()) throw new InvalidCredentialsError();
		const hash = await this.tokenHasher.hash(actor.sessionToken);
		const session = await this.sessionRepo
			.findByTokenHash(hash)
			.catch((error: unknown) => {
				if (error instanceof DomainError) throw new InvalidCredentialsError();
				throw error;
			});
		if (
			!session ||
			session.getRevokedAt() ||
			session.getExpiresAt().getTime() <= this.dateProvider.now().getTime()
		)
			throw new InvalidCredentialsError();
		const user = await this.userRepo.findById(session.getUserId());
		if (!user) throw new InvalidCredentialsError();
		return user;
	}
}
