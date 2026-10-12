import { User } from "@/domain/entities/User";
import { UserAlreadyExistsError } from "../../errors/UserAlreadyExistsError";
import type { PasswordHasher } from "../../PasswordHasher";
import type { UserRepository } from "../../repositories/UserRepository";
import type { Command } from "./Command";

export type CreateFirstAdminInput = {
	email: string;
	password: string;
	name: string;
};

export class CreateFirstAdmin
	implements Command<undefined, CreateFirstAdminInput, undefined>
{
	constructor(
		private userRepo: UserRepository,
		private passwordHasher: PasswordHasher,
	) {}

	async execute(
		_actor: undefined,
		input: CreateFirstAdminInput,
	): Promise<undefined> {
		const firstAdminExists = !!(await this.userRepo.findFirstAdmin());
		if (firstAdminExists) throw new UserAlreadyExistsError();
		const passwordHash = await this.passwordHasher.hash(input.password);
		const user = User.create(input.name, input.email, passwordHash, "admin");
		await this.userRepo.save(user);
	}
}
