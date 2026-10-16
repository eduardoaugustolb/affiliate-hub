import type { HttpRestResponseBuilder } from "./HttpRestResponseBuilder";

export enum HttpMethod {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	DELETE = "DELETE",
}

export enum HttpStatusCode {
	OK = 200,
	FOUND = 302,
	SEE_OTHER = 303,
	GONE = 410,
	CREATED = 201,
	NO_CONTENT = 204,
	BAD_REQUEST = 400,
	INTERNAL_SERVER_ERROR = 500,
	NOT_FOUND = 404,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	CONFLICT = 409,
	UNPROCESSABLE_ENTITY = 422,
}

export type HttpRestRequest = {
	cookies: Record<string, string>;
	body: unknown;
	params: Record<string, string>;
	query: Record<string, string>;
	headers: Record<string, string>;
};

export type HttpRestCookie = {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: Date;
	/** Lifetime in seconds. Use zero to remove the cookie. */
	maxAge?: number;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "Strict" | "Lax" | "None";
};

export type HttpRestResponse = {
	status: HttpStatusCode;
	body: unknown;
	headers: Record<string, string>;
	cookies?: HttpRestCookie[];
};

export interface HttpRestServer {
	register(
		method: HttpMethod,
		path: string,
		handler: (
			req: HttpRestRequest,
			res: HttpRestResponseBuilder,
		) => Promise<HttpRestResponse>,
	): void;
	close(): Promise<void>;
	listen(port: number): Promise<void>;
}
