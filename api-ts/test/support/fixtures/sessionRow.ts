import { dateProvider } from "./dateProvider";

export const sessionExpiresAt = new Date("2026-10-04T13:00:00Z");

export const sessionRow = {
	id: "persisted-id",
	userId: "user-123",
	tokenHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	expiresAt: sessionExpiresAt,
	revokedAt: null,
	createdAt: dateProvider.now(),
	updatedAt: dateProvider.now(),
};
