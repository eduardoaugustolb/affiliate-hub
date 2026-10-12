import type { ProductCodeGenerator } from "@/application/ProductCodeGenerator";

export class ProductCodeGeneratorFake implements ProductCodeGenerator {
	generate(): string {
		return "ABC123";
	}
}
