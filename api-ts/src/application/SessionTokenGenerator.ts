export interface SessionTokenGenerator {
	generate(bytes: number): string;
}
