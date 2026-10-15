import { describe, expect, it } from "bun:test";
import { BadRequestError } from "@/application/errors/BadRequestError";
import { ErrorMapper } from "@/infra/ErrorMapper";
import { HttpStatusCode } from "@/infra/http/HttpRestServer";

describe("ErrorMapper", () => {
	it.each([
		{ error: new BadRequestError(), message: "Bad request" },
		{
			error: new BadRequestError("Email is required"),
			message: "Email is required",
		},
	])(
		"maps BadRequestError to HTTP 400: $message",
		async ({ error, message }) => {
			expect(await ErrorMapper.toRestResponse(error)).toEqual({
				status: HttpStatusCode.BAD_REQUEST,
				body: { message, code: "BAD_REQUEST" },
				headers: { "Content-Type": "application/json" },
			});
		},
	);
});
