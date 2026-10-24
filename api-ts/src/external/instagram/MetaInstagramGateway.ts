import { BadRequestError } from "@/application/errors/BadRequestError";
import type {
	InstagramGateway,
	SendAction,
	SendOutcome,
} from "@/application/instagram/InstagramPorts";
import { instagramPostUrl } from "@/domain/entities/InstagramCampaign";

type GraphResponse = {
	permalink?: string;
	id?: string;
	user_id?: string;
	username?: string;
	text?: string;
	timestamp?: string;
	message_id?: string;
	recipient_id?: string;
	media?: { id?: string };
	from?: { id?: string };
	data?: GraphResponse[];
	error?: { code?: number };
	paging?: { next?: string; cursors?: { after?: string } };
};
const validId = (value: unknown): value is string =>
	typeof value === "string" && /^\d{1,40}$/.test(value);
function id(value: unknown): string {
	if (!validId(value)) throw new BadRequestError("Invalid Instagram ID");
	return value;
}
class GraphFailure extends Error {
	constructor(
		readonly outcome: "unknown" | "rejected",
		readonly code: string,
	) {
		super("Instagram API request failed");
	}
}
export class MetaInstagramGateway implements InstagramGateway {
	private readonly fetchImpl: (
		input: string | URL | Request,
		init?: RequestInit,
	) => Promise<Response>;
	constructor(
		private readonly config: {
			accountId: string;
			accessToken: string;
			apiVersion: string;
			timeoutMs?: number;
		},
		fetchImpl: (
			input: string | URL | Request,
			init?: RequestInit,
		) => Promise<Response> = globalThis.fetch,
	) {
		id(config.accountId);
		if (
			!config.accessToken ||
			!/^v\d+\.0$/.test(config.apiVersion) ||
			(config.timeoutMs !== undefined &&
				(!Number.isInteger(config.timeoutMs) ||
					config.timeoutMs < 1 ||
					config.timeoutMs > 60000))
		)
			throw new BadRequestError("Invalid Instagram configuration");
		this.fetchImpl = fetchImpl;
	}
	private async request(
		path: string,
		query: Record<string, string> = {},
		body?: unknown,
	): Promise<GraphResponse> {
		const url = new URL(
			`https://graph.instagram.com/${this.config.apiVersion}/${path}`,
		);
		for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			return await Promise.race([
				(async () => {
					const response = await this.fetchImpl(url, {
						method: body === undefined ? "GET" : "POST",
						redirect: "error",
						signal: controller.signal,
						headers: {
							Authorization: `Bearer ${this.config.accessToken}`,
							...(body === undefined
								? {}
								: { "Content-Type": "application/json" }),
						},
						...(body === undefined ? {} : { body: JSON.stringify(body) }),
					});
					let data: GraphResponse;
					try {
						const parsed: unknown = await response.json();
						if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
							throw new GraphFailure("unknown", "INVALID_RESPONSE");
						data = parsed as GraphResponse;
					} catch {
						throw new GraphFailure("unknown", "INVALID_RESPONSE");
					}
					if (!response.ok || data?.error)
						throw new GraphFailure(
							response.status >= 400 &&
								response.status < 500 &&
								Number.isInteger(data?.error?.code)
								? "rejected"
								: "unknown",
							Number.isInteger(data?.error?.code)
								? `GRAPH_${data.error?.code}`
								: "GRAPH_ERROR",
						);
					return data;
				})(),
				new Promise<GraphResponse>((_, reject) => {
					timer = setTimeout(() => {
						controller.abort();
						reject(new GraphFailure("unknown", "TIMEOUT"));
					}, this.config.timeoutMs ?? 15000);
				}),
			]);
		} catch (error) {
			if (error instanceof GraphFailure) throw error;
			throw new GraphFailure("unknown", "NETWORK_ERROR");
		} finally {
			clearTimeout(timer);
		}
	}
	async identity() {
		const data = await this.request("me", { fields: "user_id,id,username" });
		if (
			data &&
			Object.hasOwn(data, "data") &&
			(!Array.isArray(data.data) ||
				data.data.length !== 1 ||
				["user_id", "id", "username"].some((key) => Object.hasOwn(data, key)))
		)
			throw new GraphFailure("unknown", "INVALID_IDENTITY");
		const item =
			Array.isArray(data?.data) && data.data.length === 1 ? data.data[0] : data;
		if (
			!validId(item?.user_id) ||
			(item.id !== undefined && !validId(item.id)) ||
			item.user_id !== this.config.accountId ||
			typeof item.username !== "string" ||
			!/^[A-Za-z0-9._]{1,30}$/.test(item.username)
		)
			throw new GraphFailure("unknown", "INVALID_IDENTITY");
		return { id: item.user_id, username: item.username };
	}
	async resolvePost(input: string) {
		const url = instagramPostUrl(input);
		let after: string | undefined;
		const seen = new Set<string>();
		for (let page = 0; page < 20; page++) {
			const data = await this.request(`${this.config.accountId}/media`, {
				fields: "id,permalink",
				limit: "100",
				...(after ? { after } : {}),
			});
			if (!Array.isArray(data?.data) || data.data.length > 100)
				throw new GraphFailure("unknown", "INVALID_RESPONSE");
			for (const item of data.data) {
				if (!validId(item?.id) || typeof item.permalink !== "string")
					throw new GraphFailure("unknown", "INVALID_RESPONSE");
				let canonical: string;
				try {
					canonical = instagramPostUrl(item.permalink);
				} catch {
					throw new GraphFailure("unknown", "INVALID_RESPONSE");
				}
				if (canonical === url) return { id: item.id, url };
			}
			if (!data.paging?.next) break;
			after = data.paging?.cursors?.after;
			if (
				typeof after !== "string" ||
				!after ||
				after.length > 4096 ||
				seen.has(after)
			)
				throw new GraphFailure("unknown", "INVALID_PAGINATION");
			seen.add(after);
		}
		throw new BadRequestError("Post was not found among account media");
	}
	async comment(commentId: string) {
		const data = await this.request(id(commentId), {
			fields: "id,media,from,text,timestamp",
		});
		const createdAt =
			typeof data?.timestamp === "string" ? Date.parse(data.timestamp) : NaN;
		if (
			data?.id !== commentId ||
			!validId(data?.media?.id) ||
			!validId(data?.from?.id) ||
			typeof data?.text !== "string" ||
			!Number.isFinite(createdAt)
		)
			throw new GraphFailure("unknown", "INVALID_COMMENT");
		return {
			id: commentId,
			mediaId: data.media.id,
			senderId: data.from.id,
			text: data.text,
			createdAt,
		};
	}
	async send(
		action: SendAction,
		recipient: string,
		text: string,
	): Promise<SendOutcome> {
		id(recipient);
		if (
			!["private", "public", "message"].includes(action) ||
			typeof text !== "string" ||
			!text.trim() ||
			Buffer.byteLength(text) > 1000
		)
			throw new BadRequestError("Invalid Instagram message");
		try {
			const data = await this.request(
				action === "public"
					? `${recipient}/replies`
					: `${this.config.accountId}/messages`,
				{},
				action === "public"
					? { message: text }
					: {
							recipient:
								action === "private"
									? { comment_id: recipient }
									: { id: recipient },
							message: { text },
						},
			);
			if (action === "public" && validId(data?.id))
				return { status: "accepted", externalId: data.id };
			if (
				action !== "public" &&
				typeof data?.message_id === "string" &&
				data.message_id.trim() &&
				data.message_id.length <= 512 &&
				validId(data?.recipient_id) &&
				(action !== "message" || data.recipient_id === recipient)
			)
				return { status: "accepted", externalId: data.message_id };
			return { status: "unknown", code: "INVALID_RECEIPT" };
		} catch (error) {
			return error instanceof GraphFailure
				? { status: error.outcome, code: error.code }
				: { status: "unknown", code: "UNCONFIRMED" };
		}
	}
}
