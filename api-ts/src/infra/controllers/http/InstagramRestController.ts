import { BadRequestError } from "@/application/errors/BadRequestError";
import type {
	InstagramRepository,
	InstagramWebhookVerifier,
} from "@/application/instagram/InstagramPorts";
import type { ManageInstagramCampaigns } from "@/application/instagram/ManageInstagramCampaigns";
import {
	HttpMethod,
	type HttpRestRequest,
	type HttpRestServer,
	HttpStatusCode,
} from "@/infra/http/HttpRestServer";

export class InstagramRestController {
	constructor(
		server: HttpRestServer,
		campaigns: ManageInstagramCampaigns,
		repository: InstagramRepository,
		webhook: InstagramWebhookVerifier,
		cookieName: string,
	) {
		const actor = (req: HttpRestRequest) => ({
			sessionToken: req.cookies[cookieName] ?? "",
		});
		const base = "/integrations/instagram";
		server.register(HttpMethod.GET, `${base}/status`, async (req, res) =>
			res
				.header("Cache-Control", "no-store")
				.json(await campaigns.status(actor(req))),
		);
		server.register(HttpMethod.GET, `${base}/campaigns`, async (req, res) =>
			res
				.header("Cache-Control", "no-store")
				.json(await campaigns.list(actor(req))),
		);
		server.register(HttpMethod.PUT, `${base}/campaigns/:id`, async (req, res) =>
			res
				.header("Cache-Control", "no-store")
				.json(await campaigns.save(actor(req), req.params.id ?? "", req.body)),
		);
		server.register(
			HttpMethod.DELETE,
			`${base}/campaigns/:id`,
			async (req, res) => {
				await campaigns.remove(actor(req), req.params.id ?? "");
				return res.empty();
			},
		);
		server.register(HttpMethod.POST, `${base}/preview`, async (req, res) => {
			if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
				throw new BadRequestError("Expected configuration and text");
			const { configuration, text } = req.body as Record<string, unknown>;
			return res
				.header("Cache-Control", "no-store")
				.json(await campaigns.preview(actor(req), configuration, text));
		});
		server.register(HttpMethod.GET, `${base}/history`, async (req, res) =>
			res
				.header("Cache-Control", "no-store")
				.json(await campaigns.history(actor(req))),
		);
		server.register(HttpMethod.GET, "/webhooks/instagram", async (req, res) =>
			res.text(webhook.handshake(new URLSearchParams(req.query))),
		);
		server.register(
			HttpMethod.POST,
			"/webhooks/instagram",
			async (req, res) => {
				const events = webhook.normalize(
					req.rawBody ?? new Uint8Array(),
					req.headers["x-hub-signature-256"] ?? null,
				);
				await repository.enqueue(events);
				return res.status(HttpStatusCode.OK).text("EVENT_RECEIVED");
			},
			{ parseJson: false },
		);
	}
}
