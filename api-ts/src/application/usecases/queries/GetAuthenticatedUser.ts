import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import type { SessionRepository } from "@/application/repositories/SessionRepository";
import type { UserRepository } from "@/application/repositories/UserRepository";
import { DomainError } from "@/domain/errors/DomainError";
import type { DateProvider } from "@/infra/DateProvider";
import type { Query } from "./Query";

export type GetAuthenticatedUserActor = {
	sessionTokenHash: string;
};

export type GetAuthenticatedUserOutput = {
	id: string;
	name: string;
	email: string;
	role: string;
};

export class GetAuthenticatedUser
	implements
		Query<GetAuthenticatedUserActor, undefined, GetAuthenticatedUserOutput>
{
	constructor(
		private readonly userRepo: UserRepository,
		private readonly sessionRepo: SessionRepository,
		private readonly dateProvider: DateProvider,
	) {}

	async execute(
		actor: GetAuthenticatedUserActor,
	): Promise<GetAuthenticatedUserOutput> {
		if (!actor.sessionTokenHash.trim()) throw new InvalidCredentialsError();

		const session = await this.sessionRepo
			.findByTokenHash(actor.sessionTokenHash)
			.catch((error: unknown) => {
				if (error instanceof DomainError) throw new InvalidCredentialsError();
				throw error;
			});
		if (
			!session ||
			session.getExpiresAt().getTime() <= this.dateProvider.now().getTime() ||
			session.getRevokedAt()
		)
			throw new InvalidCredentialsError();

		const user = await this.userRepo.findById(session.getUserId());

		if (!user) throw new InvalidCredentialsError();

		return {
			id: user.getId(),
			email: user.getEmail(),
			name: user.getName(),
			role: user.getRole(),
		};
	}
}
