import type { ProductRepository } from "@/application/repositories/ProductRepository";
import type { Product } from "@/domain/entities/Product";

export class ProductRepositoryFake implements ProductRepository {
	db: Map<string, Product>;
	constructor() {
		this.db = new Map();
	}

	async findById(id: string): Promise<Product | undefined> {
		return this.db.get(id);
	}

	async findByCode(code: string): Promise<Product | undefined> {
		for (const product of this.db.values()) {
			if (product.getCode().getValue() === code) {
				return product;
			}
		}
		return undefined;
	}

	async save(product: Product): Promise<void> {
		this.db.set(product.getId(), product);
	}

	async update(product: Product): Promise<void> {
		this.db.set(product.getId(), product);
	}

	async remove(id: string): Promise<void> {
		this.db.delete(id);
	}
}
