import type { ProductCodeGenerator } from "@/application/ProductCodeGenerator";
export class BunProductCodeGenerator implements ProductCodeGenerator {
	generate(): string {
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		// Rejection sampling avoids modulo bias if the alphabet changes.
		let code = "";
		while (code.length < 6) {
			for (const value of crypto.getRandomValues(new Uint8Array(12))) {
				if (value >= 256 - (256 % alphabet.length)) continue;
				code += alphabet[value % alphabet.length];
				if (code.length === 6) break;
			}
		}
		return code;
	}
}
