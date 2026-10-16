import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { ProductNotFoundError } from "@/application/errors/ProductNotFoundError";
import { ProductUnavailableError } from "@/application/errors/ProductUnavailableError";
import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import { DomainError } from "@/domain/errors/DomainError";
import { type HttpRestResponse, HttpStatusCode } from "./http/HttpRestServer";

export class ErrorMapper {
	static async toRestResponse(error: Error): Promise<HttpRestResponse> {
		if (error instanceof BadRequestError) {
			return {
				status: HttpStatusCode.BAD_REQUEST,
				body: {
					message: error.message,
					code: error.code,
				},
				headers: {
					"Content-Type": "application/json",
				},
			};
		}

		if (error instanceof ProductUnavailableError)
			return {
				status: HttpStatusCode.GONE,
				body: { code: error.code, message: error.message },
				headers: { "Content-Type": "application/json" },
			};

		if (error instanceof ProductNotFoundError) {
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

		if (error instanceof InvalidCredentialsError) {
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

		if (error instanceof ForbiddenOperationError) {
			return {
				status: HttpStatusCode.FORBIDDEN,
				body: {
					message: error.message,
					code: error.code,
				},
				headers: {
					"Content-Type": "application/json",
				},
			};
		}

		if (error instanceof UserAlreadyExistsError) {
			return {
				status: HttpStatusCode.CONFLICT,
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

import { BadRequestError } from "@/application/errors/BadRequestError";
