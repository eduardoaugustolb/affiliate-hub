import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import { BadRequestError } from "@/application/errors/BadRequestError";
import type {
	InstagramEvent,
	StoredCampaign,
} from "@/application/instagram/InstagramPorts";
import { BunSQLAdapter } from "@/external/database/BunSQLAdapter";
import { InstagramRepositorySQL } from "@/external/database/DAOs/InstagramRepositorySQL";

function required<T>(value: T | undefined): T {
	if (value === undefined) throw new Error("Expected a persisted record");
	return value;
}

describe.skipIf(!process.env.INSTAGRAM_TEST_DATABASE_URL)(
	"Instagram durable PostgreSQL repository",
	() => {
		let db: BunSQLAdapter, repo: InstagramRepositorySQL, account: string;
		beforeAll(() => {
			db = new BunSQLAdapter({
				dbUrl: process.env.INSTAGRAM_TEST_DATABASE_URL ?? "",
			});
			repo = new InstagramRepositorySQL(db);
		});
		beforeEach(() => {
			account = crypto.randomUUID();
		});
		afterEach(async () => {
			for (const table of [
				"instagram_sends",
				"instagram_events",
				"instagram_campaigns",
			])
				await db.query(`DELETE FROM ${table} WHERE account_id = $1`, [account]);
		});
		afterAll(async () => {
			await db.close();
		});
		function event(): InstagramEvent {
			return {
				id: crypto.randomUUID(),
				accountId: account,
				kind: "comment",
				externalId: "999999999999999999",
				senderId: "888888888888888888",
				mediaId: "777777777777777777",
				text: "look",
				occurredAt: Date.now(),
			};
		}
		function campaign(): StoredCampaign {
			return {
				id: crypto.randomUUID(),
				accountId: account,
				mediaId: "777777777777777777",
				configuration: {
					name: "Test",
					enabled: true,
					source: "comment",
					postUrl: "https://www.instagram.com/p/test/",
					outfits: [],
					rules: [{ triggers: ["look"], target: "all", privateReply: "hello" }],
				},
			};
		}
		it("atomically rejects overlapping scopes and prevents changing ownership", async () => {
			const c = campaign();
			await repo.saveCampaign(c);
			expect(
				repo.saveCampaign({ ...c, id: crypto.randomUUID() }),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(
				repo.saveCampaign({ ...c, accountId: "other" }),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(await repo.listCampaigns(account)).toEqual([c]);
		});
		it("deduplicates delivery and claims concurrently across repository instances", async () => {
			const e = event();
			await repo.enqueue([e, e]);
			expect(await repo.claimEvent("other")).toBeUndefined();
			const claims = await Promise.all([
				repo.claimEvent(account),
				new InstagramRepositorySQL(db).claimEvent(account),
			]);
			expect(claims.filter(Boolean)).toHaveLength(1);
			expect(claims.find(Boolean)).toMatchObject(e);
		});
		it("fences expired event leases and persists bounded retries", async () => {
			const e = event();
			await repo.enqueue([e]);
			const first = required(await repo.claimEvent(account));
			await db.query(
				"UPDATE instagram_events SET lease_until = now() - interval '1 second' WHERE id = $1",
				[e.id],
			);
			const second = required(await repo.claimEvent(account));
			await repo.finishEvent(e.id, first.claim, "stale");
			await repo.retryEvent(e.id, first.claim);
			expect(
				(
					await db.query<{ status: string }>(
						"SELECT status FROM instagram_events WHERE id = $1",
						[e.id],
					)
				)[0]?.status,
			).toBe("processing");
			await repo.retryEvent(e.id, second.claim);
			expect(await repo.claimEvent(account)).toBeUndefined();
			await db.query(
				"UPDATE instagram_events SET attempts = 4, available_at = now() - interval '1 second' WHERE id = $1",
				[e.id],
			);
			const last = required(await repo.claimEvent(account));
			await repo.retryEvent(e.id, last.claim);
			expect(await repo.claimEvent(account)).toBeUndefined();
			expect((await repo.history(account))[0]).toMatchObject({
				status: "failed",
				attempts: 5,
			});
		});
		it("keeps the permanent send ledger across restart and campaign deletion", async () => {
			const c = campaign(),
				e = event();
			await repo.saveCampaign(c);
			await repo.enqueue([e]);
			const results = await Promise.all([
				repo.claimSend(e, "private", "secret reply"),
				repo.claimSend(e, "private", "secret reply"),
			]);
			expect(results.filter((r) => r.claimed)).toHaveLength(1);
			const key = required(results[0]).record.key;
			await repo.finishSend(key, { status: "unknown", code: "timeout" });
			await repo.finishSend(key, { status: "accepted", externalId: "late" });
			await repo.removeCampaign(account, c.id);
			const duplicate = await new InstagramRepositorySQL(db).claimSend(
				e,
				"private",
				"changed",
			);
			expect(duplicate).toEqual({
				claimed: false,
				record: { key, status: "unknown", code: "timeout" },
			});
			expect(JSON.stringify(await repo.history(account))).not.toContain(
				"secret reply",
			);
			expect(await repo.claimEvent(account)).toMatchObject(e);
		});
		it("rolls back an entire invalid enqueue batch", async () => {
			const e = event();
			const failure = await repo
				.enqueue([e, { ...event(), kind: "invalid" as "comment" }])
				.catch((error) => error);
			expect(failure).toBeDefined();
			expect(await repo.claimEvent(account)).toBeUndefined();
		});
		it("enforces the inbox scope and reads JSONB configuration", async () => {
			const c = campaign();
			c.mediaId = null;
			c.configuration.source = "message";
			c.configuration.postUrl = null;
			await repo.saveCampaign(c);
			expect(await repo.findCampaign(account, "message", null)).toEqual(c);
			expect(
				repo.saveCampaign({ ...c, id: crypto.randomUUID() }),
			).rejects.toBeInstanceOf(BadRequestError);
			await repo.saveCampaign({
				...c,
				configuration: { ...c.configuration, enabled: false },
			});
			expect(await repo.findCampaign(account, "message", null)).toBeUndefined();
		});
		it("caps safe history and preserves completed results after duplicate delivery", async () => {
			const first = event();
			await repo.enqueue([first]);
			const claimed = required(await repo.claimEvent(account));
			await repo.finishEvent(first.id, claimed.claim, "no_match");
			await repo.enqueue([{ ...first, id: crypto.randomUUID() }]);
			expect(await repo.claimEvent(account)).toBeUndefined();
			expect((await repo.history(account))[0]).toMatchObject({
				status: "done",
				result: "no_match",
				attempts: 1,
			});
			await repo.enqueue(
				Array.from({ length: 110 }, (_, i) => ({
					...event(),
					externalId: String(i),
				})),
			);
			const history = await repo.history(account);
			expect(history).toHaveLength(100);
			expect(await repo.history("other")).toEqual([]);
			expect(JSON.stringify(history)).not.toContain(first.senderId);
		});
	},
);
