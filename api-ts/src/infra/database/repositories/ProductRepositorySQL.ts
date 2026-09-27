import type { ProductRepository } from "@/application/repositories/ProductRepository";
import { Product } from "@/domain/entities/Product";
import type { ProductDAO } from "../DAOs/ProductDAO";

export class ProductRepositorySQL implements ProductRepository {
	constructor(private readonly dao: ProductDAO) {}

	async findByCode(code: string): Promise<Product | undefined> {
		const res = await this.dao.findByCode(code);
		if (!res) return undefined;
		return Product.create(
			res.code,
			res.destinationUrl,
			res.marketplace,
			res.imageUrl,
			res.status,
		);
	}

	async findById(id: string): Promise<Product | undefined> {
		const res = await this.dao.findById(id);
		if (!res) return undefined;
		return Product.create(
			res.code,
			res.destinationUrl,
			res.marketplace,
			res.imageUrl,
			res.status,
		);
	}

	async remove(id: string): Promise<void> {
		await this.remove(id);
	}

	async save(product: Product): Promise<void> {
		await this.dao.save({
			id: product.getId(),
			code: product.getCode().getValue(),
			destinationUrl: product.getDestinationUrl().getValue(),
			marketplace: product.getMarketplace().getValue(),
			imageUrl: product.getImageUrl().getUrl(),
			status: product.getStatus().getValue(),
		});
	}

	async update(product: Product): Promise<void> {
		await this.dao.update({
			id: product.getId(),
			code: product.getCode().getValue(),
			destinationUrl: product.getDestinationUrl().getValue(),
			marketplace: product.getMarketplace().getValue(),
			imageUrl: product.getImageUrl().getUrl(),
			status: product.getStatus().getValue(),
		});
	}
}
