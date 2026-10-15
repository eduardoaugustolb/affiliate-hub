import {
	type HttpRestCookie,
	type HttpRestResponse,
	HttpStatusCode,
} from "./HttpRestServer";

export class HttpRestResponseBuilder {
	private statusCode = HttpStatusCode.OK;
	private readonly headers: Record<string, string> = {};
	private readonly cookies: HttpRestCookie[] = [];

	status(status: HttpStatusCode): this {
		this.statusCode = status;
		return this;
	}

	header(name: string, value: string): this {
		this.headers[name.toLowerCase()] = value;
		return this;
	}

	setCookie(
		name: string,
		value: string,
		options: Omit<HttpRestCookie, "name" | "value"> = {},
	): this {
		this.cookies.push({ ...options, name, value });
		return this;
	}

	clearCookie(
		name: string,
		options: Omit<HttpRestCookie, "name" | "value" | "maxAge" | "expires"> = {},
	): this {
		return this.setCookie(name, "", {
			...options,
			maxAge: 0,
			expires: new Date(0),
		});
	}

	json(body: unknown): HttpRestResponse {
		return this.header("Content-Type", "application/json; charset=UTF-8").build(
			body,
		);
	}

	text(body: string): HttpRestResponse {
		return this.header("Content-Type", "text/plain; charset=UTF-8").build(body);
	}

	html(body: string): HttpRestResponse {
		return this.header("Content-Type", "text/html; charset=UTF-8").build(body);
	}

	empty(status = HttpStatusCode.NO_CONTENT): HttpRestResponse {
		return this.status(status).build(undefined);
	}

	private build(body: unknown): HttpRestResponse {
		return {
			status: this.statusCode,
			body,
			headers: { ...this.headers },
			cookies: this.cookies.map((cookie) => ({ ...cookie })),
		};
	}
}
