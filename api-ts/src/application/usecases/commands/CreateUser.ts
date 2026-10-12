import { User } from "@/domain/entities/User";
import { ForbiddenOperationError } from "../../errors/ForbiddenOperationError";
import type { PasswordHasher } from "../../PasswordHasher";
import { UserCreationPolicy } from "../../policy/UserCreationPolicy";
import type { UserRepository } from "../../repositories/UserRepository";
import type { Command } from "./Command";

export type CreateUserInput = {
	name: string;
	email: string;
	password: string;
	role: string;
};

export class CreateUser implements Command<User, CreateUserInput, undefined> {
	constructor(
		private readonly userRepo: UserRepository,
		private readonly passwordHasher: PasswordHasher,
	) {}

	async execute(actor: User, input: CreateUserInput): Promise<undefined> {
		if (!UserCreationPolicy.canCreate(actor)) {
			throw new ForbiddenOperationError("Only admins can create users");
		}

		const passwordHash = await this.passwordHasher.hash(input.password);
		const user = User.create(input.name, input.email, passwordHash, input.role);
		await this.userRepo.save(user);
	}
}
