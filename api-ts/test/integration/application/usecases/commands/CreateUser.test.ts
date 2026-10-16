import { describe, expect, it, mock, spyOn } from "bun:test";
import { authenticatedSession } from "@test/support/fixtures/authenticatedSession";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { InvalidCredentialsError } from "@/application/errors/InvalidCredentialsError";
import { CreateUser } from "@/application/usecases/commands/CreateUser";

describe("CreateUser", () => {
	async function setup() {
		const session = await authenticatedSession();
		const passwordHasher = {
			hash: mock(async (password: string) => `hashed:${password}`),
			verify: mock(async () => false),
		};
		const input = {
			name: "New user",
			email: "new@example.com",
			password: "secret",
			role: "admin",
		};
		const useCase = new CreateUser(
			session.userRepo,
			session.authenticator,
			passwordHasher,
		);
		return { ...session, passwordHasher, input, useCase };
	}
	it("allows an authenticated admin to create a user", async () => {
		const { userRepo, actor, passwordHasher, input, useCase } = await setup();
		await useCase.execute(actor, input);
		expect(passwordHasher.hash).toHaveBeenCalledWith(input.password);
		const user = await userRepo.findByEmail(input.email);
		expect(user?.getName()).toBe(input.name);
		expect(user?.getPasswordHash()).toBe("hashed:secret");
		expect(user?.getRole()).toBe(input.role);
	});
	it("rejects a non-admin without hashing or saving", async () => {
		const { userRepo, actor, passwordHasher, input, useCase } = await setup();
		const find = userRepo.findById.bind(userRepo);
		spyOn(userRepo, "findById").mockImplementation(async (id) => {
			const result = await find(id);
			if (result) spyOn(result, "getRole").mockReturnValue("user");
			return result;
		});
		const save = spyOn(userRepo, "save");
		try {
			await useCase.execute(actor, input);
			throw new Error("Expected rejection");
		} catch (error) {
			expect(error).toBeInstanceOf(ForbiddenOperationError);
		}
		expect(passwordHasher.hash).not.toHaveBeenCalled();
		expect(save).not.toHaveBeenCalled();
	});
	it("rejects an unknown session without hashing or saving", async () => {
		const { userRepo, passwordHasher, input, useCase } = await setup();
		const save = spyOn(userRepo, "save");
		try {
			await useCase.execute({ sessionToken: "unknown" }, input);
			throw new Error("Expected rejection");
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidCredentialsError);
		}
		expect(passwordHasher.hash).not.toHaveBeenCalled();
		expect(save).not.toHaveBeenCalled();
	});
});
