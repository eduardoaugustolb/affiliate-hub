import type { SessionTokenHasher } from "@/application/SessionTokenHasher";

export class BunSessionTokenHasher implements SessionTokenHasher {
	async hash(token: string): Promise<string> {
		return Bun.SHA256.hash(token, "hex");
	}
}
