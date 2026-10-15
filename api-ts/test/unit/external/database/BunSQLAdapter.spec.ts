import { describe, expect, it } from "bun:test";
import type { SQL } from "bun";
import { BunSQLAdapter } from "@/external/database/BunSQLAdapter";

function setup(failOn?: string) {
	const calls: { sql: string; params?: unknown[] }[] = [];
	let releases = 0;
	const rows = [{ id: 1 }];
	const reserved = {
		async unsafe(sql: string, params?: unknown[]) {
			calls.push({ sql, params });
			if (sql === failOn) throw new Error("Query failed");
			return rows;
		},
		release() {
			releases++;
		},
	};
	const adapter = Object.create(BunSQLAdapter.prototype) as BunSQLAdapter;
	adapter.conn = {
		unsafe: reserved.unsafe,
		async reserve() {
			return reserved;
		},
	} as unknown as SQL;
	return { adapter, calls, rows, releases: () => releases };
}

describe("BunSQLAdapter", () => {
	it("passes query parameters separately and returns rows", async () => {
		const { adapter, calls, rows } = setup();
		const params = ["O'Reilly"];
		expect(await adapter.query("SELECT $1 AS name", params)).toBe(rows);
		expect(calls).toEqual([{ sql: "SELECT $1 AS name", params }]);
	});

	it("keeps transaction queries on a reserved connection until commit", async () => {
		const { adapter, calls, releases } = setup();
		const tx = await adapter.transaction();
		await tx.query("UPDATE users SET name = $1", ["Alice"]);
		expect(releases()).toBe(0);
		await tx.commit();
		expect(calls).toEqual([
			{ sql: "BEGIN" },
			{ sql: "UPDATE users SET name = $1", params: ["Alice"] },
			{ sql: "COMMIT" },
		]);
		expect(releases()).toBe(1);
	});

	it("releases the reservation if BEGIN fails", async () => {
		const { adapter, releases } = setup("BEGIN");
		let failure: unknown;
		try {
			await adapter.transaction();
		} catch (error) {
			failure = error;
		}
		expect(failure).toEqual(new Error("Query failed"));
		expect(releases()).toBe(1);
	});

	it.each(["commit", "rollback"] as const)(
		"%s releases the connection and prevents reuse",
		async (action) => {
			const { adapter, calls, releases } = setup();
			const tx = await adapter.transaction();
			await tx[action]();
			expect(calls.map(({ sql }) => sql)).toEqual([
				"BEGIN",
				action.toUpperCase(),
			]);
			expect(releases()).toBe(1);
			expect(tx.query("SELECT 1")).rejects.toThrow("closed");
			expect(tx.commit()).rejects.toThrow("closed");
			expect(tx.rollback()).rejects.toThrow("closed");
			expect(releases()).toBe(1);
		},
	);

	it.each(["commit", "rollback"] as const)(
		"%s releases the connection even when SQL fails",
		async (action) => {
			const { adapter, releases } = setup(action.toUpperCase());
			const tx = await adapter.transaction();
			let failure: unknown;
			try {
				await tx[action]();
			} catch (error) {
				failure = error;
			}
			expect(failure).toEqual(new Error("Query failed"));
			expect(releases()).toBe(1);
			expect(tx.query("SELECT 1")).rejects.toThrow("closed");
			expect(tx.commit()).rejects.toThrow("closed");
			expect(tx.rollback()).rejects.toThrow("closed");
		},
	);
});
