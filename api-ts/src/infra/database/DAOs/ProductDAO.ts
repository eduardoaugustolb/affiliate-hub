export type ProductDTO = {
	id: string;
	code: string;
	destinationUrl: string;
	marketplace: string;
	imageUrl: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
};
export type InputProductDTO = Omit<ProductDTO, "createdAt" | "updatedAt">;
export interface ProductDAO {
	save(entity: InputProductDTO): Promise<void>;
	update(entity: InputProductDTO): Promise<void>;
	remove(id: string): Promise<void>;
	findById(id: string): Promise<ProductDTO | undefined>;
	findByCode(value: string): Promise<ProductDTO | undefined>;
	findByMarketplace(value: string): Promise<ProductDTO[]>;
	findByDestinationUrl(value: string): Promise<ProductDTO[]>;
}
