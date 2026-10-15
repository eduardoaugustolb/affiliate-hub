import type { IdGenerator } from "@/application/IdGenerator";

export class BunUUIDIdGenerator implements IdGenerator {
	generate(): string {
		return Bun.randomUUIDv7();
	}
}
