import type { DateProvider } from "@/infra/date/Provider";
import { SessionExpiresAt } from "./SessionExpiresAt";
import { SessionRevokedAt } from "./SessionRevokedAt";

export class Session {
	private id: string;
	private expiresAt: SessionExpiresAt;
	private revokedAt: SessionRevokedAt;
	private userId: string;
	private tokenHash: string;

	private constructor(
		id: string,
		expiresAt: Date,
		revokedAt: Date | null,
		userId: string,
		tokenHash: string,
		dateProvider: DateProvider,
	) {
		this.id = id;
		this.expiresAt = new SessionExpiresAt(expiresAt, dateProvider);
		this.revokedAt = new SessionRevokedAt(revokedAt, dateProvider);
		this.userId = userId;
		this.tokenHash = tokenHash;
	}

	static create(
		expiresAt: Date,
		userId: string,
		tokenHash: string,
		dateProvider: DateProvider,
	): Session {
		return new Session("", expiresAt, null, userId, tokenHash, dateProvider);
	}

	static rehydrate(
		id: string,
		expiresAt: Date,
		revokedAt: Date | null,
		userId: string,
		tokenHash: string,
		dateProvider: DateProvider,
	): Session {
		return new Session(
			id,
			expiresAt,
			revokedAt,
			userId,
			tokenHash,
			dateProvider,
		);
	}

	getId(): string {
		return this.id;
	}

	getExpiresAt(): Date {
		return this.expiresAt.getValue();
	}

	getUserId(): string {
		return this.userId;
	}

	getTokenHash(): string {
		return this.tokenHash;
	}

	getRevokedAt(): Date | null {
		return this.revokedAt.getValue();
	}
}
