import type { IdGenerator } from "@/application/IdGenerator";

export class IdGeneratorFake implements IdGenerator {
	generate(): string {
		return Math.random().toString(36).substring(2, 4);
	}
}
