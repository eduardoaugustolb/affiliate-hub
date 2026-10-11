import type { SessionRepository } from "./repositories/SessionRepository";
import type { UserRepository } from "./repositories/UserRepository";

type AuthenticationUnitOfWorkFallbackContext = {
	userRepo: UserRepository;
	sessionRepo: SessionRepository;
};

type AuthenticationUnitOfWorkFallback = (
	ctx: AuthenticationUnitOfWorkFallbackContext,
) => Promise<unknown> | unknown;

export interface AuthenticationUnitOfWork {
	withinTransaction(
		fn: AuthenticationUnitOfWorkFallback,
	): Promise<ReturnType<AuthenticationUnitOfWorkFallback>>;
}
