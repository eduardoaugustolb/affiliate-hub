import { UserAlreadyExistsError } from "@/application/errors/UserAlreadyExistsError";
import type {
	InputUserDTO,
	UserDAO,
	UserDTO,
} from "@/infra/database/DAOs/UserDAO";

export class UserDAOFake implements UserDAO {
	readonly db = new Map<string, UserDTO>();
	async save(entity: InputUserDTO): Promise<void> {
		if (this.db.has(entity.id)) throw new Error("Duplicate id");
		if ([...this.db.values()].some((row) => row.email === entity.email))
			throw new UserAlreadyExistsError();
		const now = new Date();
		this.db.set(entity.id, { ...entity, createdAt: now, updatedAt: now });
	}
	async update(entity: InputUserDTO): Promise<void> {
		const existing = this.db.get(entity.id);
		if (
			existing &&
			[...this.db.values()].some(
				(row) => row.id !== entity.id && row.email === entity.email,
			)
		)
			throw new UserAlreadyExistsError();
		if (existing)
			this.db.set(entity.id, { ...existing, ...entity, updatedAt: new Date() });
	}
	async deleteById({ id }: Pick<UserDTO, "id">): Promise<void> {
		this.db.delete(id);
	}
	async findById({ id }: Pick<UserDTO, "id">): Promise<UserDTO | null> {
		return this.db.get(id) ?? null;
	}
	async findByEmail({
		email: value,
	}: Pick<UserDTO, "email">): Promise<UserDTO | null> {
		return [...this.db.values()].find((row) => row.email === value) ?? null;
	}
	async findFirstAdmin(): Promise<UserDTO | null> {
		return [...this.db.values()].find((row) => row.role === "admin") ?? null;
	}
}
