export interface TaskScheduler {
  schedule(cronExpression: string, task: () => Promise<void>): void
}
