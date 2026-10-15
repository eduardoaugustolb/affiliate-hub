export interface HttpClient {
	get(url: string, options?: HttpClient.Options): Promise<HttpClient.Response>;
	post(
		url: string,
		body: unknown,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response>;
	put(
		url: string,
		body: unknown,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response>;
	delete(
		url: string,
		options?: HttpClient.Options,
	): Promise<HttpClient.Response>;
}
export namespace HttpClient {
	export type Options = {
		headers?: Record<string, string>;
		timeoutMs?: number;
	};
	export type Response = {
		statusCode: number;
		body?: unknown;
		headers: Record<string, string>;
		cookies: string[];
	};
}
