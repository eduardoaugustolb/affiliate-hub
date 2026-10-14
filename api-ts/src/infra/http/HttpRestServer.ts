export enum HttpMethod {
	GET = "GET",
	POST = "POST",
	PUT = "PUT",
	DELETE = "DELETE",
}

export enum HttpStatusCode {
	OK = 200,
	BAD_REQUEST = 400,
	INTERNAL_SERVER_ERROR = 500,
	NOT_FOUND = 404,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	CONFLICT = 409,
	UNPROCESSABLE_ENTITY = 422,
}

export type HttpRestRequest = {
	body: unknown;
	params: Record<string, string>;
	query: Record<string, string>;
	headers: Record<string, string>;
};

export type HttpRestResponse = {
	status: HttpStatusCode;
	body: unknown;
	headers: Record<string, string>;
};

export interface HttpRestServer {
	register(
		method: HttpMethod,
		path: string,
		handler: (
			req: HttpRestRequest,
			res: HttpRestResponse,
		) => Promise<HttpRestResponse>,
	): void;
	close(): Promise<void>;
	listen(port: number): Promise<void>;
}
