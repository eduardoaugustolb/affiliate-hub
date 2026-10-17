export type ListProductsDTO = { limit: number; offset: number };
export type ProductDTO = {
	id: string;
	code: string;
	name: string;
	destinationUrl: string;
	marketplace: string;
	imageUrl: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
};
export type InputProductDTO = Omit<ProductDTO, "createdAt" | "updatedAt">;
export interface ProductDAO {
	list(input: ListProductsDTO): Promise<ProductDTO[]>;
	save(entity: InputProductDTO): Promise<void>;
	update(entity: InputProductDTO): Promise<void>;
	remove(input: Pick<ProductDTO, "id">): Promise<void>;
	findById(input: Pick<ProductDTO, "id">): Promise<ProductDTO | undefined>;
	findByCode(input: Pick<ProductDTO, "code">): Promise<ProductDTO | undefined>;
	findByMarketplace(
		input: Pick<ProductDTO, "marketplace">,
	): Promise<ProductDTO[]>;
	findByDestinationUrl(
		input: Pick<ProductDTO, "destinationUrl">,
	): Promise<ProductDTO[]>;
}
