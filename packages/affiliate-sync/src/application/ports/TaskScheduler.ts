export interface TaskScheduler {
  scheduleEvery(intervalMs: number, task: () => Promise<void>): ScheduledTask
}

export interface ScheduledTask {
  close(): void
}
