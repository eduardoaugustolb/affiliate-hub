import type { Product } from "@/domain/entities/Product";

export interface ProductDAO {
	findById(id: number): Promise<Product | undefined>;
}
