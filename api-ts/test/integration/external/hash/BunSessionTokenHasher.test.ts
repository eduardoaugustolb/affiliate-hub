import { describe, expect, it } from "bun:test";
import { BunSessionTokenHasher } from "@/external/hash/BunSessionTokenHasher";

describe("BunSessionTokenHasher", () => {
	it("returns a deterministic SHA-256 hex digest for session tokens", async () => {
		const hasher = new BunSessionTokenHasher();
		const digest = await hasher.hash("session-token");
		expect(digest).toBe(Bun.SHA256.hash("session-token", "hex"));
		expect(digest).toMatch(/^[a-f0-9]{64}$/);
		expect(digest).not.toContain("session-token");
	});
});
