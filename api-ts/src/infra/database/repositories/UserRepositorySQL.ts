import type { IdGenerator } from "@/application/IdGenerator";
import type { UserRepository } from "@/application/repositories/UserRepository";
import { User } from "@/domain/entities/User";

import type { UserDAO } from "../DAOs/UserDAO";
export class UserRepositorySQL implements UserRepository {
	constructor(
		private readonly dao: UserDAO,
		private readonly idGenerator: IdGenerator,
	) {}
	async findById(value: string): Promise<User | null> {
		const row = await this.dao.findById(value);
		return row
			? User.rehydrate(row.id, row.name, row.email, row.passwordHash, row.role)
			: null;
	}
	async findByEmail(value: string): Promise<User | null> {
		const row = await this.dao.findByEmail(value);
		return row
			? User.rehydrate(row.id, row.name, row.email, row.passwordHash, row.role)
			: null;
	}
	async findFirstAdmin(): Promise<User | null> {
		const row = await this.dao.findFirstAdmin();
		return row
			? User.rehydrate(row.id, row.name, row.email, row.passwordHash, row.role)
			: null;
	}
	async save(entity: User): Promise<void> {
		await this.dao.save({
			id: entity.getId() || this.idGenerator.generate(),
			name: entity.getName(),
			email: entity.getEmail(),
			passwordHash: entity.getPasswordHash(),
			role: entity.getRole(),
		});
	}
	async update(entity: User): Promise<void> {
		if (!entity.getId()) throw new Error("Cannot update user without an id");
		await this.dao.update({
			id: entity.getId() || this.idGenerator.generate(),
			name: entity.getName(),
			email: entity.getEmail(),
			passwordHash: entity.getPasswordHash(),
			role: entity.getRole(),
		});
	}
	async deleteById(id: string): Promise<void> {
		await this.dao.deleteById(id);
	}
}
