import type { User } from "@/domain/entities/User";

export class UserCreationPolicy {
	static canCreate(actor: User): boolean {
		return actor.getRole() === "admin";
	}
}
