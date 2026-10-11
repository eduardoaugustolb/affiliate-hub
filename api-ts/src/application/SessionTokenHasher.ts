export interface SessionTokenHasher {
	hash(token: string): Promise<string>;
}
