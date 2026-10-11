import type { SessionTokenGenerator } from "@/application/SessionTokenGenerator";

export class BunTokenGenerator implements SessionTokenGenerator {
	generate(bytes: number): string {
		return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString(
			"base64url",
		);
	}
}
