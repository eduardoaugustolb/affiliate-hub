import type { ClickLog, ClickRecord } from '../../src/application/ports/ClickLog'

export class ClickLogFake implements ClickLog {
  readonly registered: ClickRecord[] = []

  async register(click: ClickRecord): Promise<void> {
    this.registered.push(click)
  }
}
