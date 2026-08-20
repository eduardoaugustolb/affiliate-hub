export interface PrometheusMetricsQueue {
  exportPrometheusMetrics(globalVariables?: Record<string, string>): Promise<string>
}

export interface AffiliateImportOutboxMetrics {
  getSnapshot(): Promise<{
    unprocessedOverTenMinutes: number
    averageProcessingLatencyMs: number
    maxProcessingLatencyMs: number
  }>
}

export function createWorkerMetricsServer(
  queue: PrometheusMetricsQueue,
  outboxMetrics: AffiliateImportOutboxMetrics,
  port: number,
) {
  return Bun.serve({
    port,
    fetch: async (request) => {
      if (new URL(request.url).pathname !== '/metrics') {
        return new Response('Not Found', { status: 404 })
      }

      const [queueMetrics, outbox] = await Promise.all([
        queue.exportPrometheusMetrics({ service: 'affiliate-import-worker' }),
        outboxMetrics.getSnapshot(),
      ])
      const body = [
        queueMetrics.trimEnd(),
        '# HELP affiliate_import_outbox_unprocessed_over_ten_minutes Number of unprocessed import events older than ten minutes.',
        '# TYPE affiliate_import_outbox_unprocessed_over_ten_minutes gauge',
        `affiliate_import_outbox_unprocessed_over_ten_minutes ${outbox.unprocessedOverTenMinutes}`,
        '# HELP affiliate_import_processing_latency_milliseconds Processing latency of recently completed import events.',
        '# TYPE affiliate_import_processing_latency_milliseconds gauge',
        `affiliate_import_processing_latency_milliseconds{stat="average"} ${outbox.averageProcessingLatencyMs}`,
        `affiliate_import_processing_latency_milliseconds{stat="max"} ${outbox.maxProcessingLatencyMs}`,
        '',
      ].join('\n')

      return new Response(body, {
        headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
      })
    },
  })
}
