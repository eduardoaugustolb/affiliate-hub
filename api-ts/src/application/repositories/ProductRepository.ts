import type { Product } from "@/domain/entities/Product";

export interface ProductRepository {
	findById(id: string): Promise<Product | undefined>;
	findByCode(code: string): Promise<Product | undefined>;
	save(product: Product): Promise<void>;
	update(product: Product): Promise<void>;
	remove(id: string): Promise<void>;
}
