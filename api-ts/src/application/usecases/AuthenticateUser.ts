import { Session } from "@/domain/entities/Session";
import type { DateProvider } from "@/infra/date/Provider";
import type { AuthenticationUnitOfWork } from "../AuthenticationUnitOfWork";
import { UnauthorizedError } from "../errors/UnauthorizedError";
import type { PasswordHasher } from "../PasswordHasher";
import { AuthenticationPolicy } from "../policy/AuthenticationPolicy";
import type { SessionTokenGenerator } from "../SessionTokenGenerator";
import type { SessionTokenHasher } from "../SessionTokenHasher";
import type { UseCase } from "./UseCase";

export type AuthenticateUserInput = {
	email: string;
	password: string;
};

export class AuthenticateUser
	implements UseCase<undefined, AuthenticateUserInput, string>
{
	constructor(
		private readonly unitOfWork: AuthenticationUnitOfWork,
		private readonly dateProvider: DateProvider,
		private readonly passwordHasher: PasswordHasher,
		private readonly sessionTokenGenerator: SessionTokenGenerator,
		private readonly sessionTokenHasher: SessionTokenHasher,
	) {}

	async execute(_: undefined, input: AuthenticateUserInput): Promise<string> {
		return (await this.unitOfWork.withinTransaction(async (ctx) => {
			const user = await ctx.userRepo.findByEmail(input.email);
			if (!user) throw new UnauthorizedError("Password or email is invalid");

			const isValidPassword = await this.passwordHasher.verify(
				input.password,
				user.getPasswordHash(),
			);

			if (!isValidPassword)
				throw new UnauthorizedError("Password or email is invalid");

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
			await ctx.sessionRepo.save(session);
			return sessionTokenHash;
		})) as string;
	}
}
