export type UserDTO = {
	id: string;
	name: string;
	email: string;
	passwordHash: string;
	role: string;
	createdAt: Date;
	updatedAt: Date;
};
export type InputUserDTO = Omit<UserDTO, "createdAt" | "updatedAt">;
export interface UserDAO {
	save(entity: InputUserDTO): Promise<void>;
	update(entity: InputUserDTO): Promise<void>;
	deleteById(id: string): Promise<void>;
	findById(id: string): Promise<UserDTO | null>;
	findByEmail(value: string): Promise<UserDTO | null>;
	findFirstAdmin(): Promise<UserDTO | null>;
}
