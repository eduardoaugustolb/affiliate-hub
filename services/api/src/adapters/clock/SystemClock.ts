import type { Clock } from '@affiliate-hub/shared-kernel'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
