import { NotFoundError } from "../application/errors/NotFound";
import { type HttpResponse, HttpStatusCode } from "./http/HttpServer";

export class ErrorMapper {
	static async toRestResponse(error: Error): Promise<HttpResponse> {
		if (error instanceof NotFoundError) {
			return {
				status: HttpStatusCode.NOT_FOUND,
				body: {
					message: error.message,
					code: error.code,
				},
				headers: {},
			};
		}
		return {
			status: HttpStatusCode.INTERNAL_SERVER_ERROR,
			body: {
				message: error.message,
				code: "INTERNAL_SERVER_ERROR",
			},
			headers: {},
		};
	}
}
