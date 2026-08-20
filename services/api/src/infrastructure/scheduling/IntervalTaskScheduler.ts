import type { ScheduledTask, TaskScheduler } from '@affiliate-hub/affiliate-sync'

export class IntervalTaskScheduler implements TaskScheduler {
  scheduleEvery(intervalMs: number, task: () => Promise<void>): ScheduledTask {
    const timer = setInterval(() => {
      void task().catch((error) => {
        console.error('Scheduled task failed', error)
      })
    }, intervalMs)

    return {
      close: () => clearInterval(timer),
    }
  }
}
