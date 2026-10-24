import { describe, expect, it, mock } from "bun:test";
import { RedisCatalogCache } from "@/external/RedisCatalogCache";

function setup() {
	const values = new Map<string, string>();
	const client = {
		get: mock(async (key: string) => values.get(key) ?? null),
		send: mock(async (_command: string, args: string[]) => {
			const [key, value] = args;
			if (key === undefined || value === undefined)
				throw new Error("Invalid SET arguments");
			values.set(key, value);
			return "OK";
		}),
	};
	const load = mock(async () => [
		{
			id: "color" as const,
			name: "Cor",
			options: [{ id: "opt", name: "Azul" }],
		},
	]);
	return { client, values, load, cache: new RedisCatalogCache(client, "test") };
}
describe("RedisCatalogCache", () => {
	it("loads once and writes a bounded TTL", async () => {
		const { cache, client, load } = setup();
		expect(await cache.read(load)).toEqual(await cache.read(load));
		expect(load).toHaveBeenCalledTimes(1);
		expect(client.send.mock.calls[0]?.[1].slice(-2)).toEqual(["EX", "30"]);
	});
	it("uses a fresh generation after invalidation", async () => {
		const { cache, load } = setup();
		await cache.read(load);
		await cache.invalidate();
		await cache.read(load);
		expect(load).toHaveBeenCalledTimes(2);
	});
	it.each([
		"not json",
		"null",
		'{"id":1}',
		'[{"id":"id","name":"Cor","options":[null]}]',
	])("ignores corrupt cached values %s", async (value) => {
		const { cache, values, load } = setup();
		values.set("test:initial", value);
		expect(await cache.read(load)).toHaveLength(1);
		expect(load).toHaveBeenCalledTimes(1);
	});
	it("survives Redis read, write and invalidation failures", async () => {
		const { cache, client, load } = setup();
		client.get.mockRejectedValue(new Error("offline"));
		client.send.mockRejectedValue(new Error("offline"));
		expect(await cache.read(load)).toHaveLength(1);
		await cache.invalidate();
	});
	it("does not cache database failures", () => {
		const { cache, client } = setup();
		expect(
			cache.read(async () => {
				throw new Error("database failed");
			}),
		).rejects.toThrow("database failed");
		expect(client.send).not.toHaveBeenCalled();
	});
	it("does not let an in-flight stale read populate a fresh generation", async () => {
		const { cache, load } = setup();
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const old = cache.read(async () => {
			await gate;
			return [];
		});
		// Allow the read to capture the current generation and enter its loader.
		await new Promise((resolve) => setTimeout(resolve, 0));
		await cache.invalidate();
		release();
		await old;
		expect(await cache.read(load)).toHaveLength(1);
	});
});

// Explicit opt-in: this test uses only its own temporary keys.
import { RedisClient } from "bun";

it.skipIf(!process.env.CATALOG_TEST_REDIS_URL)(
	"uses the Bun Redis client for real hits, TTL and invalidation",
	async () => {
		const url = process.env.CATALOG_TEST_REDIS_URL;
		if (!url) throw new Error("Missing test Redis URL");
		const client = new RedisClient(url, {
			connectionTimeout: 500,
			enableOfflineQueue: false,
			maxRetries: 1,
		});
		const prefix = `affiliate-hub:catalog-test:${crypto.randomUUID()}`;
		try {
			const cache = new RedisCatalogCache(client, prefix);
			const load = mock(async () => [
				{ id: "color" as const, name: "Cor", options: [] },
			]);
			await cache.read(load);
			await cache.read(load);
			expect(load).toHaveBeenCalledTimes(1);
			expect(await client.ttl(`${prefix}:initial`)).toBeGreaterThan(0);
			await cache.invalidate();
			await cache.read(load);
			expect(load).toHaveBeenCalledTimes(2);
		} finally {
			if (client.connected) {
				const generation = await client.get(`${prefix}:generation`);
				await client.del(
					`${prefix}:initial`,
					`${prefix}:generation`,
					`${prefix}:${generation}`,
				);
			}
			client.close();
		}
	},
);

it("falls back to the database when explicit Redis connection fails", async () => {
	const client = {
		connected: false,
		connect: mock(async () => {
			throw new Error("offline");
		}),
		get: mock(async () => null),
		send: mock(async () => "OK"),
	};
	const cache = new RedisCatalogCache(client),
		load = mock(async () => []);
	expect(await cache.read(load)).toEqual([]);
	await cache.invalidate();
	expect(load).toHaveBeenCalledTimes(1);
	expect(client.get).not.toHaveBeenCalled();
	expect(client.send).not.toHaveBeenCalled();
});
