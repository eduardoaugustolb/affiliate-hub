import { ProductCodeAlreadyExistsError } from "@/application/errors/ProductCodeAlreadyExistsError";
import type { IdGenerator } from "@/application/IdGenerator";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import { Product } from "@/domain/entities/Product";

export class ProductRepositoryFake implements ProductRepository {
	private readonly reserved = new Set<string>();
	db: Map<string, Product>;
	constructor(private readonly idGenerator: IdGenerator) {
		this.db = new Map();
	}

	async list(limit: number, offset: number): Promise<Product[]> {
		return [...this.db.values()].slice(offset, offset + limit);
	}
	async findById(id: string): Promise<Product | undefined> {
		return this.db.get(id);
	}

	async findByCode(code: string): Promise<Product | undefined> {
		for (const product of this.db.values()) {
			if (product.getCode() === code) {
				return product;
			}
		}
		return undefined;
	}

	async save(product: Product): Promise<void> {
		if (this.reserved.has(product.getCode()))
			throw new ProductCodeAlreadyExistsError();
		this.reserved.add(product.getCode());
		const id = product.getId() || this.idGenerator.generate();
		product = Product.rehydrate(
			id,
			product.getCode(),
			product.getDestinationUrl(),
			product.getMarketplace(),
			product.getImageUrl(),
			product.getStatus(),
			product.getName(),
			product.getImageUrls(),
		);
		this.db.set(product.getId(), product);
	}

	async update(product: Product): Promise<void> {
		this.db.set(product.getId(), product);
	}

	async remove(id: string): Promise<void> {
		this.db.delete(id);
	}
}
