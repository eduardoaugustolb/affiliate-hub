export interface Validator {
	validate(data: unknown): Promise<boolean>;
}
