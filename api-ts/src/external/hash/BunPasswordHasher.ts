import type { PasswordHasher } from "@/application/PasswordHasher";

type Algorithm =
	| Bun.Password.AlgorithmLabel
	| Bun.Password.Argon2Algorithm
	| Bun.Password.BCryptAlgorithm;

export class BunPasswordHasher implements PasswordHasher {
	constructor(private algorithm?: Algorithm) {}

	async hash(password: string) {
		return await Bun.password.hash(password, this.algorithm);
	}

	async verify(password: string, hash: string) {
		return await Bun.password.verify(password, hash);
	}
}
