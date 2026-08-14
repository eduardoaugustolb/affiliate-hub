import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'

export interface OutboxEvent {
  id: number
  eventId: string
  name: string
  payload: unknown
  lockToken: string
}

export type OutboxEventHandler = (event: OutboxEvent) => Promise<void>

interface OutboxEventRow {
  id: number
  event_id: string
  name: string
  payload: unknown
  lock_token: string
}

export class OutboxDispatcher {
  constructor(
    private readonly db: DatabaseConnection,
    private readonly handlers: Record<string, OutboxEventHandler>,
  ) {}

  async dispatchOne(): Promise<boolean> {
    const event = await this.claimNext()
    if (!event) return false

    const handler = this.handlers[event.name]
    if (!handler) {
      await this.fail(event, `No handler registered for ${event.name}`)
      return true
    }

    try {
      await handler(event)
      await this.db.query(
        'update outbox_events set processed_at = now(), locked_until = null, lock_token = null where id = $1 and lock_token = $2',
        [event.id, event.lockToken],
      )
    } catch (error) {
      await this.fail(event, error instanceof Error ? error.message : String(error))
    }
    return true
  }

  private async claimNext(): Promise<OutboxEvent | null> {
    const lockToken = crypto.randomUUID()
    const rows = await this.db.query<OutboxEventRow>(
      `with next_event as (
         select id from outbox_events
         where processed_at is null
           and available_at <= now()
           and (locked_until is null or locked_until <= now())
         order by id
         for update skip locked
         limit 1
       )
       update outbox_events
       set locked_until = now() + interval '5 minutes', lock_token = $1, attempts = attempts + 1
       where id = (select id from next_event)
       returning id, event_id, name, payload, lock_token`,
      [lockToken],
    )
    const row = rows[0]
    if (!row) return null
    return {
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      lockToken: row.lock_token,
    }
  }

  private async fail(event: OutboxEvent, message: string): Promise<void> {
    await this.db.query(
      `update outbox_events
       set locked_until = null,
           lock_token = null,
           last_error = $3,
           available_at = now() + case
             when attempts = 1 then interval '1 minute'
             when attempts = 2 then interval '5 minutes'
             when attempts = 3 then interval '15 minutes'
             else interval '1 hour'
           end
       where id = $1 and lock_token = $2`,
      [event.id, event.lockToken, message],
    )
  }
}
