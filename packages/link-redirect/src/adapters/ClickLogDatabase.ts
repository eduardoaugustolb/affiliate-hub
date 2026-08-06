import type { DatabaseConnection } from '@affiliate-hub/shared-kernel'
import type { ClickLog, ClickRecord } from '../application/ports/ClickLog'

export class ClickLogDatabase implements ClickLog {
  constructor(private readonly db: DatabaseConnection) {}

  async register(click: ClickRecord): Promise<void> {
    await this.db.query('insert into click_logs (product_id, clicked_at) values ($1, $2)', [
      click.productId,
      click.clickedAt,
    ])
  }
}
