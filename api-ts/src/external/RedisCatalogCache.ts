import type { CatalogCache } from "@/application/CatalogCache";
import type { FilterCategory } from "@/application/CatalogRepository";
export interface CatalogRedisClient {
	readonly connected?: boolean;
	connect?(): Promise<void>;
	get(key: string): Promise<string | null>;
	send(command: string, args: string[]): Promise<unknown>;
}
/** Cache failure must never prevent a catalog read or committed mutation. */
export class RedisCatalogCache implements CatalogCache {
	constructor(
		private readonly client: CatalogRedisClient,
		private readonly prefix = "affiliate-hub:catalog:v2",
	) {}
	private connection?: Promise<void>;
	private async ready() {
		if (!this.client.connect || this.client.connected) return;
		this.connection ??= this.client.connect().finally(() => {
			this.connection = undefined;
		});
		await this.connection;
	}
	async read(load: () => Promise<FilterCategory[]>): Promise<FilterCategory[]> {
		let key: string | undefined;
		try {
			await this.ready();
			const generation =
				(await this.client.get(`${this.prefix}:generation`)) ?? "initial";
			key = `${this.prefix}:${generation}`;
			const cached = await this.client.get(key);
			if (cached) {
				const parsed: unknown = JSON.parse(cached);
				if (
					Array.isArray(parsed) &&
					parsed.every(
						(c) =>
							c &&
							(c.id === "size" || c.id === "color") &&
							typeof c.name === "string" &&
							Array.isArray(c.options) &&
							c.options.every(
								(o: { id?: unknown; name?: unknown } | null) =>
									o && typeof o.id === "string" && typeof o.name === "string",
							),
					)
				)
					return parsed;
			}
		} catch {
			/* fall back to the database */
		}
		const categories = await load();
		if (key)
			try {
				await this.client.send("SET", [
					key,
					JSON.stringify(categories),
					"EX",
					"30",
				]);
			} catch {
				/* optional cache */
			}
		return categories;
	}
	async invalidate(): Promise<void> {
		try {
			await this.ready();
			await this.client.send("SET", [
				`${this.prefix}:generation`,
				crypto.randomUUID(),
			]);
		} catch {
			/* old entries expire after 30 seconds */
		}
	}
}
