import { ProductCodeAlreadyExistsError } from "@/application/errors/ProductCodeAlreadyExistsError";
import type {
	InputProductDTO,
	ProductDAO,
	ProductDTO,
} from "@/infra/database/DAOs/ProductDAO";
export class ProductDAOFake implements ProductDAO {
	private readonly reserved = new Set<string>();
	readonly db = new Map<string, ProductDTO>();
	async list(limit: number, offset: number): Promise<ProductDTO[]> {
		return [...this.db.values()]
			.sort(
				(a, b) =>
					b.createdAt.getTime() - a.createdAt.getTime() ||
					b.id.localeCompare(a.id),
			)
			.slice(offset, offset + limit);
	}
	async save(entity: InputProductDTO): Promise<void> {
		if (this.db.has(entity.id)) throw new Error("Duplicate id");
		if (this.reserved.has(entity.code))
			throw new ProductCodeAlreadyExistsError();
		this.reserved.add(entity.code);
		const now = new Date();
		this.db.set(entity.id, { ...entity, createdAt: now, updatedAt: now });
	}
	async update(entity: InputProductDTO): Promise<void> {
		const existing = this.db.get(entity.id);
		if (
			existing &&
			[...this.db.values()].some(
				(row) => row.id !== entity.id && row.code === entity.code,
			)
		)
			throw new ProductCodeAlreadyExistsError();
		if (existing)
			this.db.set(entity.id, { ...existing, ...entity, updatedAt: new Date() });
	}
	async remove(id: string): Promise<void> {
		this.db.delete(id);
	}
	async findById(id: string): Promise<ProductDTO | undefined> {
		return this.db.get(id) ?? undefined;
	}
	async findByCode(value: string): Promise<ProductDTO | undefined> {
		return [...this.db.values()].find((row) => row.code === value) ?? undefined;
	}
	async findByMarketplace(value: string): Promise<ProductDTO[]> {
		return [...this.db.values()].filter((row) => row.marketplace === value);
	}
	async findByDestinationUrl(value: string): Promise<ProductDTO[]> {
		return [...this.db.values()].filter((row) => row.destinationUrl === value);
	}
}
