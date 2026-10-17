import type { SessionRepository } from "@/application/repositories/SessionRepository";
import type { SessionActor } from "@/application/SessionAuthenticator";
import type { SessionTokenHasher } from "@/application/SessionTokenHasher";
import { Session } from "@/domain/entities/Session";
import { DomainError } from "@/domain/errors/DomainError";
import type { DateProvider } from "@/infra/DateProvider";
import type { Command } from "./Command";
export class Logout implements Command<SessionActor, undefined> {
	constructor(
		private readonly repo: SessionRepository,
		private readonly hasher: SessionTokenHasher,
		private readonly clock: DateProvider,
	) {}
	async execute(actor: SessionActor): Promise<void> {
		if (!actor.sessionToken.trim()) return;
		const session = await this.repo
			.findByTokenHash(await this.hasher.hash(actor.sessionToken))
			.catch((error: unknown) => {
				if (error instanceof DomainError) return null;
				throw error;
			});
		if (!session || session.getRevokedAt()) return;
		await this.repo.update(
			Session.rehydrate(
				session.getId(),
				session.getExpiresAt(),
				this.clock.now(),
				session.getUserId(),
				session.getTokenHash(),
				this.clock,
			),
		);
	}
}
