import { BadRequestError } from "@/application/errors/BadRequestError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import type { SessionTokenHasher } from "@/application/SessionTokenHasher";
import type { AuthenticateUser } from "@/application/usecases/commands/AuthenticateUser";
import type { GetAuthenticatedUser } from "@/application/usecases/queries/GetAuthenticatedUser";
import { Email } from "@/domain/entities/Email";
import {
	HttpMethod,
	type HttpRestServer,
	HttpStatusCode,
} from "@/infra/http/HttpRestServer";

export class AuthRestController {
	constructor(
		private httpServer: HttpRestServer,
		private authenticateUser: AuthenticateUser,
		private getAuthenticatedUser: GetAuthenticatedUser,
		private sessionCookieName: string,
		private sessionTokenHasher: SessionTokenHasher,
	) {
		this.httpServer.register(HttpMethod.GET, "/auth/me", async (req, res) => {
			const sessionCookie = req.cookies[this.sessionCookieName];
			if (!sessionCookie) throw new InvalidCredentialsError();
			const session = await this.getAuthenticatedUser.execute({
				sessionTokenHash: await this.sessionTokenHasher.hash(sessionCookie),
			});

			return res.json(session);
		});

		this.httpServer.register(
			HttpMethod.POST,
			"/auth/login",
			async (req, res) => {
				if (
					!req.body ||
					typeof req.body !== "object" ||
					Array.isArray(req.body)
				) {
					throw new BadRequestError("Invalid login payload");
				}
				const { email, password } = req.body as Record<string, unknown>;

				if (
					typeof email !== "string" ||
					typeof password !== "string" ||
					!email.trim() ||
					!password.trim()
				)
					throw new BadRequestError("Email and password is required");

				try {
					new Email(email);
				} catch (_) {
					throw new BadRequestError("Invalid email");
				}

				const sessionCookie = await this.authenticateUser.execute(undefined, {
					email,
					password,
				});

				res.setCookie(this.sessionCookieName, sessionCookie, {
					path: "/",
					httpOnly: true,
					sameSite: "Strict",
					secure: this.sessionCookieName.startsWith("__Host-"),
				});

				return res.empty(HttpStatusCode.OK);
			},
		);
	}
}
