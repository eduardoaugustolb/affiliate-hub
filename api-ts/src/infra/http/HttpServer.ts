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

export type HttpRequest = {
	body: unknown;
	params: Record<string, string>;
	query: Record<string, string>;
	headers: Record<string, string>;
};

export type HttpResponse = {
	status: HttpStatusCode;
	body: unknown;
	headers: Record<string, string>;
};

export interface HttpServer {
	register(
		method: HttpMethod,
		path: string,
		handler: (req: HttpRequest, res: HttpResponse) => Promise<HttpResponse>,
	): void;
	close(): Promise<void>;
	listen(port: number): Promise<void>;
}
