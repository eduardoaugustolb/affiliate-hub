import { NotFoundError } from "@/application/errors/NotFoundError";
import { UnauthorizedError } from "@/application/errors/UnauthorizedError";
import { DomainError } from "@/domain/errors/DomainError";
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
				headers: {
					"Content-Type": "application/json",
				},
			};
		}

		if (error instanceof UnauthorizedError) {
			return {
				status: HttpStatusCode.UNAUTHORIZED,
				body: {
					message: error.message,
					code: error.code,
				},
				headers: {
					"Content-Type": "application/json",
				},
			};
		}

		if (error instanceof DomainError) {
			return {
				status: HttpStatusCode.UNPROCESSABLE_ENTITY,
				body: {
					code: error.code,
					message: error.message,
				},
				headers: {
					"Content-Type": "application/json",
				},
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
