import { dateProvider } from "./dateProvider";

export const productRow = {
	id: "persisted-id",
	code: "ABC123",
	destinationUrl: "https://example.com",
	marketplace: "shein",
	imageUrl: "https://example.com/image.jpg",
	status: "active",
	createdAt: dateProvider.now(),
	updatedAt: dateProvider.now(),
};
