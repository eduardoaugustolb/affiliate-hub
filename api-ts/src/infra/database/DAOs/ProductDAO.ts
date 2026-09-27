type ProductDTO = {
	id: string;
	code: string;
	destinationUrl: string;
	marketplace: string;
	imageUrl: string;
	status: string;
	updatedAt: Date;
	createdAt: Date;
};

type InputProductDTO = Omit<ProductDTO, "updatedAt" | "createdAt">;

export interface ProductDAO {
	save(product: InputProductDTO): Promise<void>;
	update(product: InputProductDTO): Promise<void>;
	findById(id: string): Promise<ProductDTO | undefined>;
	findByCode(code: string): Promise<ProductDTO | undefined>;
	findByMarketplace(marketplace: string): Promise<ProductDTO[] | undefined>;
	findByDestinationUrl(
		destinationUrl: string,
	): Promise<ProductDTO[] | undefined>;
}
