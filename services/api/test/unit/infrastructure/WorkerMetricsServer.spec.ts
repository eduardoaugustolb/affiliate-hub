import { describe, expect, it } from 'bun:test'
import { createWorkerMetricsServer } from '../../../src/infrastructure/observability/WorkerMetricsServer'

describe('WorkerMetricsServer', () => {
  it('exposes BullMQ and outbox metrics in Prometheus text format', async () => {
    const server = createWorkerMetricsServer(
      {
        exportPrometheusMetrics: async () =>
          'bullmq_job_count{queue="affiliate-product-import",state="failed"} 2\n',
      },
      {
        getSnapshot: async () => ({
          unprocessedOverTenMinutes: 3,
          averageProcessingLatencyMs: 42.5,
          maxProcessingLatencyMs: 100,
        }),
      },
      0,
    )

    try {
      const response = await fetch(`${server.url}metrics`)
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toContain('bullmq_job_count{queue="affiliate-product-import",state="failed"} 2')
      expect(body).toContain('affiliate_import_outbox_unprocessed_over_ten_minutes 3')
      expect(body).toContain(
        'affiliate_import_processing_latency_milliseconds{stat="average"} 42.5',
      )
      expect(body).toContain('affiliate_import_processing_latency_milliseconds{stat="max"} 100')
    } finally {
      server.stop(true)
    }
  })
})
