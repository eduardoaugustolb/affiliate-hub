import { Session } from "@/domain/entities/Session";
import type { DateProvider } from "@/infra/date/DateProvider";
import { InvalidCredentialsError } from "../../errors/InvalidCredentialsError";
import type { PasswordHasher } from "../../PasswordHasher";
import { AuthenticationPolicy } from "../../policy/AuthenticationPolicy";
import type { SessionRepository } from "../../repositories/SessionRepository";
import type { UserRepository } from "../../repositories/UserRepository";
import type { SessionTokenGenerator } from "../../SessionTokenGenerator";
import type { SessionTokenHasher } from "../../SessionTokenHasher";
import type { Command } from "./Command";

export type AuthenticateUserInput = {
	email: string;
	password: string;
};

export class AuthenticateUser
	implements Command<undefined, AuthenticateUserInput, string>
{
	constructor(
		private readonly userRepo: UserRepository,
		private readonly sessionRepo: SessionRepository,
		private readonly dateProvider: DateProvider,
		private readonly passwordHasher: PasswordHasher,
		private readonly sessionTokenGenerator: SessionTokenGenerator,
		private readonly sessionTokenHasher: SessionTokenHasher,
	) {}

	async execute(_: undefined, input: AuthenticateUserInput): Promise<string> {
		const user = await this.userRepo.findByEmail(input.email);
		if (!user) throw new InvalidCredentialsError();

		const isValidPassword = await this.passwordHasher.verify(
			input.password,
			user.getPasswordHash(),
		);

		if (!isValidPassword) throw new InvalidCredentialsError();

		const rawSessionToken = this.sessionTokenGenerator.generate(
			AuthenticationPolicy.sessionTokenBytes,
		);
		const sessionTokenHash =
			await this.sessionTokenHasher.hash(rawSessionToken);

		const session = Session.create(
			this.dateProvider.add(AuthenticationPolicy.sessionDurationMs),
			user.getId(),
			sessionTokenHash,
			this.dateProvider,
		);
		await this.sessionRepo.save(session);
		return sessionTokenHash;
	}
}
