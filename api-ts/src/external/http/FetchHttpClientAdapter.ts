import type { HttpClient } from "@/infra/http/HttpClient";

export class FetchHttpClientAdapter implements HttpClient {
	async get(
		url: string,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response> {
		return this.request("GET", url, undefined, options);
	}

	async post(
		url: string,
		body: unknown,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response> {
		return this.request("POST", url, body, options);
	}

	async put(
		url: string,
		body: unknown,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response> {
		return this.request("PUT", url, body, options);
	}

	async delete(
		url: string,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response> {
		return this.request("DELETE", url, undefined, options);
	}

	private async request(
		method: string,
		url: string,
		body?: unknown,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response> {
		const headers = new Headers(options?.headers);
		if (body !== undefined && !headers.has("Content-Type"))
			headers.set("Content-Type", "application/json");
		const response = await fetch(url, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal:
				options?.timeoutMs === undefined
					? undefined
					: AbortSignal.timeout(options.timeoutMs),
		});
		return {
			statusCode: response.status,
			body: await this.parseBody(response),
			headers: Object.fromEntries(response.headers.entries()),
			cookies: response.headers.getSetCookie(),
		};
	}

	private async parseBody(response: Response): Promise<unknown> {
		const text = await response.text();
		if (!text.length) return;
		const contentType = response.headers
			.get("Content-Type")
			?.split(";")[0]
			?.trim()
			.toLowerCase();
		return contentType === "application/json" || contentType?.endsWith("+json")
			? JSON.parse(text)
			: text;
	}
}
