import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import type { InstagramEvent } from "@/application/instagram/InstagramPorts";

const numeric = (v: unknown): v is string =>
	typeof v === "string" && /^\d{1,40}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === "object" && !Array.isArray(v);
const equal = (a: string, b: string) =>
	Buffer.byteLength(a) === Buffer.byteLength(b) &&
	timingSafeEqual(Buffer.from(a), Buffer.from(b));
/** Verify the exact request bytes before parsing or processing any event. */
export class InstagramWebhook {
	constructor(
		private readonly config: {
			accountId: string;
			appSecret: string;
			verifyToken: string;
		},
		private readonly clock: () => number = Date.now,
	) {
		if (!numeric(config.accountId) || !config.appSecret || !config.verifyToken)
			throw new BadRequestError("Invalid webhook configuration");
	}
	handshake(query: URLSearchParams): string {
		const get = (key: string) =>
			query.getAll(key).length === 1 ? query.get(key) : null;
		const token = get("hub.verify_token"),
			challenge = get("hub.challenge");
		if (
			get("hub.mode") !== "subscribe" ||
			typeof token !== "string" ||
			!equal(token, this.config.verifyToken) ||
			typeof challenge !== "string" ||
			!/^\d{1,100}$/.test(challenge)
		)
			throw new ForbiddenOperationError("Webhook verification failed");
		return challenge;
	}
	verify(raw: Uint8Array, signature: string | null): void {
		if (
			!(raw instanceof Uint8Array) ||
			typeof signature !== "string" ||
			!/^sha256=[a-f0-9]{64}$/i.test(signature)
		)
			throw new ForbiddenOperationError("Invalid webhook signature");
		const expected = createHmac("sha256", this.config.appSecret)
			.update(raw)
			.digest();
		if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex")))
			throw new ForbiddenOperationError("Invalid webhook signature");
	}
	normalize(raw: Uint8Array, signature: string | null): InstagramEvent[] {
		this.verify(raw, signature);
		if (raw.byteLength > 1024 * 1024)
			throw new BadRequestError("Webhook payload too large");
		let body: unknown;
		try {
			body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
		} catch {
			throw new BadRequestError("Malformed webhook JSON");
		}
		if (
			!record(body) ||
			body.object !== "instagram" ||
			!Array.isArray(body.entry) ||
			body.entry.length > 100
		)
			throw new BadRequestError("Malformed Instagram webhook");
		const events = new Map<string, InstagramEvent>();
		let count = 0;
		const receivedAt = this.clock();
		const add = (
			kind: InstagramEvent["kind"],
			externalId: string,
			senderId: string,
			mediaId: string | null,
			text: string,
			occurredAt: number,
		) => {
			const eventId = createHash("sha256")
				.update(JSON.stringify([this.config.accountId, kind, externalId]))
				.digest("hex");
			events.set(eventId, {
				id: eventId,
				accountId: this.config.accountId,
				kind,
				externalId,
				senderId,
				mediaId,
				text,
				occurredAt,
			});
		};
		const bounded = (items: unknown): unknown[] => {
			if (!Array.isArray(items))
				throw new BadRequestError("Too many or malformed webhook events");
			count += items.length;
			if (count > 1000) throw new BadRequestError("Too many webhook events");
			return items;
		};
		for (const entry of body.entry) {
			if (!record(entry) || !numeric(entry.id))
				throw new BadRequestError("Malformed webhook entry");
			if (entry.id !== this.config.accountId) continue;
			const changes = entry.changes === undefined ? [] : bounded(entry.changes);
			if (entry.field !== undefined)
				changes.push({ field: entry.field, value: entry.value });
			for (const change of changes) {
				if (!record(change) || typeof change.field !== "string")
					throw new BadRequestError("Malformed webhook change");
				if (change.field !== "comments") continue;
				const value = change.value;
				if (!record(value)) throw new BadRequestError("Malformed comment");
				const media = record(value.media) ? value.media : {};
				const from = record(value.from) ? value.from : {};
				if (
					media.media_product_type === "LIVE" ||
					media.media_type === "LIVE" ||
					from.id === this.config.accountId
				)
					continue;
				if (
					!numeric(value.id) ||
					!numeric(from.id) ||
					!numeric(media.id) ||
					typeof value.text !== "string" ||
					value.text.length > 10000
				)
					throw new BadRequestError("Malformed comment");
				add("comment", value.id, from.id, media.id, value.text, receivedAt);
			}
			for (const message of entry.messaging === undefined
				? []
				: bounded(entry.messaging)) {
				if (!record(message)) throw new BadRequestError("Malformed message");
				const value = record(message.message) ? message.message : {};
				const sender = record(message.sender) ? message.sender : {};
				const recipient = record(message.recipient) ? message.recipient : {};
				if (
					value.is_echo ||
					sender.id === this.config.accountId ||
					recipient.id !== this.config.accountId
				)
					continue;
				if (
					!record(message.message) ||
					value.is_deleted ||
					value.text === undefined
				)
					continue;

				if (
					!numeric(sender.id) ||
					typeof value.mid !== "string" ||
					!value.mid.trim() ||
					value.mid.length > 512 ||
					typeof value.text !== "string" ||
					value.text.length > 10000 ||
					typeof message.timestamp !== "number" ||
					!Number.isSafeInteger(message.timestamp) ||
					message.timestamp <= 0 ||
					message.timestamp > receivedAt
				)
					throw new BadRequestError("Malformed inbound message");
				add(
					"message",
					value.mid,
					sender.id,
					null,
					value.text,
					message.timestamp,
				);
			}
		}
		return [...events.values()];
	}
}
