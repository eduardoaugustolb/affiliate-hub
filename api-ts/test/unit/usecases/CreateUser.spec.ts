import { describe, expect, it, mock, spyOn } from "bun:test";
import { ForbiddenOperationError } from "@/application/errors/ForbiddenOperationError";
import { CreateUser } from "@/application/usecases/CreateUser";
import { User } from "@/domain/entities/User";
import { IdGeneratorFake } from "../../mocks/IdGeneratorFake";
import { UserRepositoryFake } from "../../mocks/UserRepositoryFake";

describe("CreateUser", () => {
	function setup() {
		const userRepo = new UserRepositoryFake(new IdGeneratorFake());
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
		const useCase = new CreateUser(userRepo, passwordHasher);
		return { userRepo, passwordHasher, input, useCase };
	}

	it("allows an admin to create a user", async () => {
		const { userRepo, passwordHasher, input, useCase } = setup();
		const save = spyOn(userRepo, "save");
		const actor = User.create("Admin", "admin@example.com", "hash", "admin");

		await useCase.execute(actor, input);

		expect(passwordHasher.hash).toHaveBeenCalledWith(input.password);
		expect(save).toHaveBeenCalledTimes(1);
		const savedUser = save.mock.calls[0]?.[0];
		expect(savedUser).toBeInstanceOf(User);
		expect(savedUser?.getName()).toBe(input.name);
		expect(savedUser?.getEmail()).toBe(input.email);
		expect(savedUser?.getPasswordHash()).toBe("hashed:secret");
		expect(savedUser?.getRole()).toBe(input.role);
	});

	it("rejects a non-admin without hashing or saving the user", () => {
		const { userRepo, passwordHasher, input, useCase } = setup();
		const save = spyOn(userRepo, "save");
		const actor = { getRole: () => "user" } as User;

		return useCase
			.execute(actor, input)
			.then(() => {
				throw new Error("Expected use case to reject");
			})
			.catch((error: unknown) => {
				expect(error).toBeInstanceOf(ForbiddenOperationError);
				expect(passwordHasher.hash).not.toHaveBeenCalled();
				expect(save).not.toHaveBeenCalled();
			});
	});
});
