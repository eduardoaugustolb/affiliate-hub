const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export class ProductId {
  private constructor(private readonly value: string) {}

  static generate(): ProductId {
    const block = () =>
      Array.from({ length: 3 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('')
    return new ProductId(`${block()}-${block()}-${block()}`)
  }

  static rehydrate(value: string): ProductId {
    return new ProductId(value)
  }

  equals(other: ProductId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
