import { describe, expect, it } from "bun:test";
import { Session } from "@/domain/entities/Session";
import { DomainError } from "@/domain/errors/DomainError";
import type { DateProvider } from "@/infra/DateProvider";

const now = new Date("2026-10-04T12:00:00.000Z");
const expiresAt = new Date("2026-10-04T13:00:00.000Z");
const past = new Date("2026-10-04T11:00:00.000Z");
const dateProvider: DateProvider = {
	now: () => new Date(now.getTime()),
	add: (ms) => new Date(now.getTime() + ms),
};
const userId = "user-123";
const tokenHash = "hashed-session-token";

describe("Session entity", () => {
	it("should create a session with valid data and no revocation", () => {
		const session = Session.create(expiresAt, userId, tokenHash, dateProvider);

		expect(session).toBeInstanceOf(Session);
		expect(session.getId()).toBe("");
		expect(session.getExpiresAt()).toEqual(expiresAt);
		expect(session.getUserId()).toBe(userId);
		expect(session.getTokenHash()).toBe(tokenHash);
		expect(session.getRevokedAt()).toBeNull();
	});

	it("should reject session creation with an expiration in the past", () => {
		expect(() => Session.create(past, userId, tokenHash, dateProvider)).toThrow(
			new DomainError("Session expires at must be in the future"),
		);
	});

	it.each([null, past, now])(
		"should rehydrate a session with revokedAt %s",
		(revokedAt) => {
			const session = Session.rehydrate(
				"session-123",
				expiresAt,
				revokedAt,
				userId,
				tokenHash,
				dateProvider,
			);

			expect(session).toBeInstanceOf(Session);
			expect(session.getId()).toBe("session-123");
			expect(session.getExpiresAt()).toEqual(expiresAt);
			expect(session.getRevokedAt()).toEqual(revokedAt);
			expect(session.getUserId()).toBe(userId);
			expect(session.getTokenHash()).toBe(tokenHash);
		},
	);

	it("should reject session rehydration with an expiration in the past", () => {
		expect(() =>
			Session.rehydrate(
				"session-123",
				past,
				null,
				userId,
				tokenHash,
				dateProvider,
			),
		).toThrow(new DomainError("Session expires at must be in the future"));
	});

	it("should reject session rehydration with a revocation in the future", () => {
		expect(() =>
			Session.rehydrate(
				"session-123",
				expiresAt,
				new Date(now.getTime() + 1),
				userId,
				tokenHash,
				dateProvider,
			),
		).toThrow(new DomainError("Invalid SessionRevokedAt value"));
	});

	it("should validate expiration using the injected date provider", () => {
		const laterDateProvider: DateProvider = {
			now: () => new Date("2026-10-04T14:00:00.000Z"),
			add: (ms) => new Date(now.getTime() + ms),
		};

		expect(() =>
			Session.create(expiresAt, userId, tokenHash, laterDateProvider),
		).toThrow(new DomainError("Session expires at must be in the future"));
	});

	it("should validate revocation using the injected date provider", () => {
		const earlierDateProvider: DateProvider = {
			now: () => new Date("2026-10-04T10:00:00.000Z"),
			add: (ms) => new Date(now.getTime() + ms),
		};

		expect(() =>
			Session.rehydrate(
				"session-123",
				expiresAt,
				past,
				userId,
				tokenHash,
				earlierDateProvider,
			),
		).toThrow(new DomainError("Invalid SessionRevokedAt value"));
	});
});
