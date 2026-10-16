import { describe, expect, it, spyOn } from "bun:test";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { dateProvider } from "@test/support/fixtures/dateProvider";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { Session } from "@/domain/entities/Session";

describe("SessionAuthenticator", () => {
	it("hashes the raw token before resolving the user", async () => {
		const { authenticator, sessionRepo, actor, user } =
			await authenticatedSession();
		const find = spyOn(sessionRepo, "findByTokenHash");
		expect((await authenticator.authenticate(actor)).getId()).toBe(
			user.getId(),
		);
		expect(find).toHaveBeenCalledWith("hashed:session-token");
	});
	it.each(["revoked", "expired", "boundary"])(
		"rejects a %s session",
		async (state) => {
			const { authenticator, sessionRepo, actor, user } =
				await authenticatedSession();
			const session = Session.rehydrate(
				"id",
				dateProvider.add(60000),
				state === "revoked" ? dateProvider.now() : null,
				user.getId(),
				"hashed:session-token",
				dateProvider,
			);
			if (state !== "revoked")
				spyOn(session, "getExpiresAt").mockReturnValue(
					new Date(
						dateProvider.now().getTime() - (state === "expired" ? 1 : 0),
					),
				);
			spyOn(sessionRepo, "findByTokenHash").mockResolvedValue(session);
			expect(authenticator.authenticate(actor)).rejects.toBeInstanceOf(
				InvalidCredentialsError,
			);
		},
	);
	it("propagates infrastructure failures", async () => {
		const { authenticator, sessionRepo, actor } = await authenticatedSession();
		const error = new Error("Database unavailable");
		spyOn(sessionRepo, "findByTokenHash").mockRejectedValue(error);
		expect(authenticator.authenticate(actor)).rejects.toBe(error);
	});
});
