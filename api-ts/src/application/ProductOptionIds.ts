import { BadRequestError } from "./errors/BadRequestError";
export function productOptionIds(value: unknown): string[] | undefined {
	if (value === undefined) return undefined;
	if (
		!Array.isArray(value) ||
		value.length > 100 ||
		value.some(
			(id) =>
				typeof id !== "string" ||
				!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
					id,
				),
		)
	)
		throw new BadRequestError("Invalid product filter options");
	return [...new Set(value.map((id) => id.toLowerCase()))];
}
