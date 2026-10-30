import { BadRequestError } from "@/application/errors/BadRequestError";
import type {
	InstagramEvent,
	InstagramRepository,
	SendAction,
	SendOutcome,
	SendRecord,
	StoredCampaign,
} from "@/application/instagram/InstagramPorts";
import type { DatabaseConnection } from "@/infra/database/DatabaseConnection";

const campaignColumns = `id, account_id AS "accountId", media_id AS "mediaId", configuration`;
const eventColumns = `e.id, e.account_id AS "accountId", e.kind, e.external_id AS "externalId", e.sender_id AS "senderId", e.media_id AS "mediaId", e.text, e.occurred_at AS "occurredAt", e.claim`;
const sendColumns = `key, status, external_id AS "externalId", code`;
function sendRecord(row: SendRecord): SendRecord {
	return {
		key: row.key,
		status: row.status,
		...(row.externalId ? { externalId: row.externalId } : {}),
		...(row.code ? { code: row.code } : {}),
	};
}
export class InstagramRepositorySQL implements InstagramRepository {
	constructor(private readonly db: DatabaseConnection) {}
	async saveCampaign(c: StoredCampaign): Promise<void> {
		try {
			const rows = await this.db.query(
				`INSERT INTO instagram_campaigns(id,account_id,source,media_id,configuration) VALUES($1,$2,$3,$4,$5::text::jsonb) ON CONFLICT(id) DO UPDATE SET source=EXCLUDED.source, media_id=EXCLUDED.media_id, configuration=EXCLUDED.configuration, updated_at=now() WHERE instagram_campaigns.account_id=EXCLUDED.account_id RETURNING id`,
				[
					c.id,
					c.accountId,
					c.configuration.source,
					c.mediaId,
					JSON.stringify(c.configuration),
				],
			);
			if (!rows.length)
				throw new BadRequestError("Campaign belongs to another account");
		} catch (error) {
			const e = error as { code?: string; errno?: string };
			if (["23505", "23514"].includes(String(e.errno ?? e.code)))
				throw new BadRequestError("Conflicting campaign scope");
			throw error;
		}
	}
	async listCampaigns(accountId: string): Promise<StoredCampaign[]> {
		return this.db.query(
			`SELECT ${campaignColumns} FROM instagram_campaigns WHERE account_id=$1 ORDER BY updated_at DESC,id`,
			[accountId],
		);
	}
	async removeCampaign(accountId: string, id: string): Promise<void> {
		await this.db.query(
			"DELETE FROM instagram_campaigns WHERE account_id=$1 AND id=$2",
			[accountId, id],
		);
	}
	async findCampaign(
		accountId: string,
		kind: InstagramEvent["kind"],
		mediaId: string | null,
	): Promise<StoredCampaign | undefined> {
		return (
			await this.db.query<StoredCampaign>(
				`SELECT ${campaignColumns} FROM instagram_campaigns WHERE account_id=$1 AND source=$2 AND media_id IS NOT DISTINCT FROM $3::text AND configuration->>'enabled'='true'`,
				[accountId, kind, kind === "message" ? null : mediaId],
			)
		)[0];
	}
	async enqueue(events: InstagramEvent[]): Promise<void> {
		if (!events.length) return;
		const tx = await this.db.transaction();
		try {
			for (const e of events)
				await tx.query(
					`INSERT INTO instagram_events(id,account_id,kind,external_id,sender_id,media_id,text,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
					[
						e.id,
						e.accountId,
						e.kind,
						e.externalId,
						e.senderId,
						e.mediaId,
						e.text,
						e.occurredAt,
					],
				);
			await tx.commit();
		} catch (error) {
			await tx.rollback();
			throw error;
		}
	}
	async claimEvent(
		accountId: string,
	): Promise<(InstagramEvent & { claim: string }) | undefined> {
		// Retire an exhausted crashed lease; a fifth attempt must never run twice.
		await this.db.query(
			`UPDATE instagram_events SET status='failed', result='attempts_exhausted', claim=NULL, lease_until=NULL, updated_at=now() WHERE account_id=$1 AND status='processing' AND lease_until<=now() AND attempts>=5`,
			[accountId],
		);
		return (
			await this.db.query<InstagramEvent & { claim: string }>(
				`WITH candidate AS (SELECT id FROM instagram_events WHERE account_id=$1 AND attempts<5 AND ((status='pending' AND available_at<=now()) OR (status='processing' AND lease_until<=now())) ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE instagram_events e SET status='processing', attempts=e.attempts+1, claim=$2::uuid, lease_until=now()+interval '60 seconds',updated_at=now() FROM candidate WHERE e.id=candidate.id RETURNING ${eventColumns}`,
				[accountId, crypto.randomUUID()],
			)
		)[0];
	}
	async finishEvent(id: string, claim: string, result: string): Promise<void> {
		await this.db.query(
			`UPDATE instagram_events SET status='done', result=$3, claim=NULL, lease_until=NULL, updated_at=now() WHERE id=$1 AND claim=$2::uuid AND status='processing' AND lease_until>now()`,
			[id, claim, result],
		);
	}
	async retryEvent(id: string, claim: string): Promise<void> {
		await this.db.query(
			`UPDATE instagram_events SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END, result=CASE WHEN attempts>=5 THEN 'attempts_exhausted' ELSE 'retry' END, available_at=now()+make_interval(secs => power(2,attempts)::integer), claim=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 AND claim=$2::uuid AND status='processing' AND lease_until>now()`,
			[id, claim],
		);
	}
	async claimSend(
		event: InstagramEvent,
		action: SendAction,
		_text: string,
	): Promise<{ claimed: boolean; record: SendRecord }> {
		const key = JSON.stringify([
			event.accountId,
			event.kind,
			event.externalId,
			action,
		]);
		const rows = await this.db.query<SendRecord>(
			`INSERT INTO instagram_sends(key,account_id,kind,event_external_id,action) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING ${sendColumns}`,
			[key, event.accountId, event.kind, event.externalId, action],
		);
		if (rows[0]) return { claimed: true, record: sendRecord(rows[0]) };
		const existing = (
			await this.db.query<SendRecord>(
				`SELECT ${sendColumns} FROM instagram_sends WHERE key=$1`,
				[key],
			)
		)[0];
		if (!existing) throw new Error("Send claim disappeared");
		return { claimed: false, record: sendRecord(existing) };
	}
	async finishSend(key: string, outcome: SendOutcome): Promise<void> {
		await this.db.query(
			`UPDATE instagram_sends SET status=$2,external_id=$3,code=$4,updated_at=now() WHERE key=$1 AND status='inflight'`,
			[
				key,
				outcome.status,
				outcome.status === "accepted" ? outcome.externalId : null,
				outcome.status === "accepted" ? null : outcome.code,
			],
		);
	}
	async history(accountId: string): Promise<unknown[]> {
		return this.db.query(
			`SELECT * FROM (SELECT 'event' AS type,id,kind,status,attempts,result,NULL::text AS action,NULL::text AS code,created_at AS "createdAt" FROM instagram_events WHERE account_id=$1 UNION ALL SELECT 'send',key,kind,status,NULL::integer,NULL::text,action,code,created_at FROM instagram_sends WHERE account_id=$1) h ORDER BY "createdAt" DESC,id LIMIT 100`,
			[accountId],
		);
	}
}
