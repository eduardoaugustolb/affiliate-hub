export class OutfitNotFoundError extends Error {
	readonly code = "OUTFIT_NOT_FOUND";
	constructor(code: string) {
		super(`Outfit with code ${code} was not found`);
		this.name = "OutfitNotFoundError";
	}
}
