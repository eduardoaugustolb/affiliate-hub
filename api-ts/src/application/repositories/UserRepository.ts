import type { User } from "@/domain/entities/User";
export interface UserRepository {
	findById(id: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>;
	save(entity: User): Promise<void>;
	update(entity: User): Promise<void>;
	deleteById(id: string): Promise<void>;
}
