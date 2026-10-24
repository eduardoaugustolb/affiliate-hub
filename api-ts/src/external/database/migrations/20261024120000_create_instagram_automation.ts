import type { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
	await knex.raw(`
 CREATE TABLE instagram_campaigns (id text PRIMARY KEY, account_id text NOT NULL, source text NOT NULL CHECK(source IN ('comment','message')), media_id text, configuration jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), CHECK ((source = 'comment' AND media_id IS NOT NULL AND media_id <> '') OR (source = 'message' AND media_id IS NULL)));
 CREATE UNIQUE INDEX instagram_campaign_scope ON instagram_campaigns(account_id, source, COALESCE(media_id,''));
 CREATE TABLE instagram_events (id text PRIMARY KEY, account_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('comment','message')), external_id text NOT NULL, sender_id text NOT NULL, media_id text, text text NOT NULL, occurred_at double precision NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','failed')), attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5), claim uuid, lease_until timestamptz, available_at timestamptz NOT NULL DEFAULT now(), result text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,kind,external_id));
 CREATE INDEX instagram_events_queue ON instagram_events(account_id, status, available_at);
 CREATE TABLE instagram_sends (key text PRIMARY KEY, account_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('comment','message')), event_external_id text NOT NULL, action text NOT NULL CHECK(action IN ('private','public','message')), status text NOT NULL DEFAULT 'inflight' CHECK(status IN ('inflight','accepted','rejected','unknown')), external_id text, code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,kind,event_external_id,action));
 CREATE INDEX instagram_sends_history ON instagram_sends(account_id,created_at DESC);
 `);
}
export async function down(knex: Knex): Promise<void> {
	await knex.raw(
		"DROP TABLE instagram_sends, instagram_events, instagram_campaigns",
	);
}
