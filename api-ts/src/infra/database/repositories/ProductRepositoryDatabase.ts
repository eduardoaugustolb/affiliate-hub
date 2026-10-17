import type { IdGenerator } from "@/application/IdGenerator";
import type { ProductRepository } from "@/application/repositories/ProductRepository";
import { Product } from "@/domain/entities/Product";

import type { ProductDAO } from "../DAOs/ProductDAO";
export class ProductRepositoryDatabase implements ProductRepository {
	constructor(
		private readonly dao: ProductDAO,
		private readonly idGenerator: IdGenerator,
	) {}
	async list(limit: number, offset: number): Promise<Product[]> {
		const rows = await this.dao.list({ limit: limit, offset: offset });
		return rows.map((row) =>
			Product.rehydrate(
				row.id,
				row.code,
				row.destinationUrl,
				row.marketplace,
				row.imageUrl,
				row.status,
				row.name,
			),
		);
	}
	async findById(value: string): Promise<Product | undefined> {
		const row = await this.dao.findById({ id: value });
		return row
			? Product.rehydrate(
					row.id,
					row.code,
					row.destinationUrl,
					row.marketplace,
					row.imageUrl,
					row.status,
					row.name,
				)
			: undefined;
	}
	async findByCode(value: string): Promise<Product | undefined> {
		const row = await this.dao.findByCode({ code: value });
		return row
			? Product.rehydrate(
					row.id,
					row.code,
					row.destinationUrl,
					row.marketplace,
					row.imageUrl,
					row.status,
					row.name,
				)
			: undefined;
	}
	async save(entity: Product): Promise<void> {
		await this.dao.save({
			id: entity.getId() || this.idGenerator.generate(),
			code: entity.getCode(),
			destinationUrl: entity.getDestinationUrl(),
			marketplace: entity.getMarketplace(),
			imageUrl: entity.getImageUrl(),
			status: entity.getStatus(),
			name: entity.getName(),
		});
	}
	async update(entity: Product): Promise<void> {
		if (!entity.getId()) throw new Error("Cannot update product without an id");
		await this.dao.update({
			id: entity.getId() || this.idGenerator.generate(),
			code: entity.getCode(),
			destinationUrl: entity.getDestinationUrl(),
			marketplace: entity.getMarketplace(),
			imageUrl: entity.getImageUrl(),
			status: entity.getStatus(),
			name: entity.getName(),
		});
	}
	async remove(id: string): Promise<void> {
		await this.dao.remove({ id: id });
	}
}
