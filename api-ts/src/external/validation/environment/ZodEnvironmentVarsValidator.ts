import { z } from "zod";
import type { Validator } from "@/infra/validation/Validator";

export const environmentVarsSchema = z.object({
	DATABASE_URL: z.string(),
});

export class EnvironmentVarsValidator implements Validator {
	constructor(private schema: z.ZodObject) {}
	async validate(data: unknown): Promise<boolean> {
		const result = this.schema.safeParse(data);
		return result.success;
	}
}
