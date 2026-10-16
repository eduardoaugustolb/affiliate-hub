import { describe, expect, it } from "bun:test";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { dateProvider } from "@test/support/fixtures/dateProvider";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { Logout } from "@/application/usecases/commands/Logout";

describe("Logout", () => {
	it("revokes the session so its token can no longer authenticate", async () => {
		const { sessionRepo, actor, authenticator } = await authenticatedSession();
		const command = new Logout(
			sessionRepo,
			{ hash: async (token) => `hashed:${token}` },
			dateProvider,
		);
		await command.execute(actor);
		expect(authenticator.authenticate(actor)).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
		await command.execute(actor);
	});
	it("tolerates missing and unknown tokens", async () => {
		const { sessionRepo } = await authenticatedSession();
		const command = new Logout(
			sessionRepo,
			{ hash: async (token) => `hashed:${token}` },
			dateProvider,
		);
		await command.execute({ sessionToken: "" });
		await command.execute({ sessionToken: "unknown" });
	});
});
