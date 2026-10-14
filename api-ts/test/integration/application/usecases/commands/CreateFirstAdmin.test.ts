import { describe, expect, it, mock, spyOn } from "bun:test";
import { IdGeneratorFake } from "@test/support/fakes/IdGeneratorFake";
import { UserRepositoryFake } from "@test/support/fakes/UserRepositoryFake";
import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import { CreateFirstAdmin } from "@/application/usecases/commands/CreateFirstAdmin";
import { User } from "@/domain/entities/User";

describe("CreateFirstAdmin", () => {
	function setup() {
		const userRepo = new UserRepositoryFake(new IdGeneratorFake());
		const passwordHasher = {
			hash: mock(async (password: string) => `hashed:${password}`),
			verify: mock(async () => false),
		};
		return {
			userRepo,
			passwordHasher,
			useCase: new CreateFirstAdmin(userRepo, passwordHasher),
		};
	}

	it("rejects creation when an admin already exists", async () => {
		const { userRepo, passwordHasher, useCase } = setup();
		await userRepo.save(
			User.create("Existing admin", "existing@example.com", "hash", "admin"),
		);
		const save = spyOn(userRepo, "save");

		const attempt = useCase.execute(undefined, {
			name: "New admin",
			email: "new@example.com",
			password: "secret",
		});
		return attempt.then(
			() => {
				throw new Error("Expected use case to reject");
			},
			(error: unknown) => {
				expect(error).toBeInstanceOf(UserAlreadyExistsError);
				expect(passwordHasher.hash).not.toHaveBeenCalled();
				expect(save).not.toHaveBeenCalled();
			},
		);
	});

	it("hashes the password and saves the first admin when none exists", async () => {
		const { userRepo, passwordHasher, useCase } = setup();
		const save = spyOn(userRepo, "save");

		await useCase.execute(undefined, {
			name: "First admin",
			email: "first@example.com",
			password: "secret",
		});

		expect(passwordHasher.hash).toHaveBeenCalledWith("secret");
		expect(save).toHaveBeenCalledTimes(1);
		const savedUser = save.mock.calls[0]?.[0];
		expect(savedUser).toBeInstanceOf(User);
		expect(savedUser?.getEmail()).toBe("first@example.com");
		expect(savedUser?.getPasswordHash()).toBe("hashed:secret");
		expect(savedUser?.getRole()).toBe("admin");
	});
});
