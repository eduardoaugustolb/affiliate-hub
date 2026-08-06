export interface ClickRecord {
  productId: string
  clickedAt: Date
}

export interface ClickLog {
  register(click: ClickRecord): Promise<void>
}
