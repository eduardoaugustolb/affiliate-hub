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
	deleteById(input: Pick<UserDTO, "id">): Promise<void>;
	findById(input: Pick<UserDTO, "id">): Promise<UserDTO | null>;
	findByEmail(input: Pick<UserDTO, "email">): Promise<UserDTO | null>;
	findFirstAdmin(): Promise<UserDTO | null>;
}
