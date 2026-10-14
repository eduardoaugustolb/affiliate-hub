import { dateProvider } from "./dateProvider";

export const userRow = {
	id: "persisted-id",
	name: "Eduardo",
	email: "eduardo@example.com",
	passwordHash: "password-hash",
	role: "admin",
	createdAt: dateProvider.now(),
	updatedAt: dateProvider.now(),
};
