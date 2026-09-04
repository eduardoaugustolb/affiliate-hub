import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'

const EVENT_NAME = 'AffiliateProductImportRequested'

export interface AffiliateImportOutboxMetrics {
  getSnapshot(): Promise<AffiliateImportOutboxMetricsSnapshot>
}

export interface AffiliateImportOutboxMetricsSnapshot {
  unprocessedOverTenMinutes: number
  averageProcessingLatencyMs: number
  maxProcessingLatencyMs: number
}

interface MetricsRow {
  unprocessed_over_ten_minutes: string
  average_processing_latency_ms: string
  max_processing_latency_ms: string
}

export class SqlAffiliateImportOutboxMetrics implements AffiliateImportOutboxMetrics {
  constructor(private readonly db: DatabaseConnection) {}

  async getSnapshot(): Promise<AffiliateImportOutboxMetricsSnapshot> {
    const rows = await this.db.query<MetricsRow>(
      `select
         count(*) filter (
           where processed_at is null
             and occurred_at <= now() - interval '10 minutes'
         ) as unprocessed_over_ten_minutes,
         coalesce(
           avg(extract(epoch from (processed_at - occurred_at)) * 1000)
             filter (where processed_at >= now() - interval '15 minutes'),
           0
         ) as average_processing_latency_ms,
         coalesce(
           max(extract(epoch from (processed_at - occurred_at)) * 1000)
             filter (where processed_at >= now() - interval '15 minutes'),
           0
         ) as max_processing_latency_ms
       from outbox_events
       where name = $1`,
      [EVENT_NAME],
    )
    const row = rows[0]

    return {
      unprocessedOverTenMinutes: Number(row?.unprocessed_over_ten_minutes ?? 0),
      averageProcessingLatencyMs: Number(row?.average_processing_latency_ms ?? 0),
      maxProcessingLatencyMs: Number(row?.max_processing_latency_ms ?? 0),
    }
  }
}
