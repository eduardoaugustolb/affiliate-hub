import { Session } from "@/domain/entities/Session";
import type { DateProvider } from "@/infra/DateProvider";
import { InvalidCredentialsError } from "../../errors/InvalidCredentialsError";
import type { PasswordHasher } from "../../PasswordHasher";
import { AuthenticationPolicy } from "../../policy/AuthenticationPolicy";
import type { SessionRepository } from "../../repositories/SessionRepository";
import type { UserRepository } from "../../repositories/UserRepository";
import type { SessionTokenHasher } from "../../SessionTokenHasher";
import type { Command } from "./Command";

export type AuthenticateUserInput = {
	email: string;
	password: string;
	sessionToken: string;
};

export class AuthenticateUser
	implements Command<undefined, AuthenticateUserInput>
{
	constructor(
		private readonly userRepo: UserRepository,
		private readonly sessionRepo: SessionRepository,
		private readonly dateProvider: DateProvider,
		private readonly passwordHasher: PasswordHasher,
		private readonly sessionTokenHasher: SessionTokenHasher,
	) {}

	async execute(_: undefined, input: AuthenticateUserInput): Promise<void> {
		const user = await this.userRepo.findByEmail(input.email);
		if (!user) throw new InvalidCredentialsError();

		const isValidPassword = await this.passwordHasher.verify(
			input.password,
			user.getPasswordHash(),
		);

		if (!isValidPassword) throw new InvalidCredentialsError();

		const sessionTokenHash = await this.sessionTokenHasher.hash(
			input.sessionToken,
		);

		const session = Session.create(
			this.dateProvider.add(AuthenticationPolicy.sessionDurationMs),
			user.getId(),
			sessionTokenHash,
			this.dateProvider,
		);
		await this.sessionRepo.save(session);
	}
}
