import { DomainError } from '@affiliate-hub/shared-kernel'

export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    const trimmed = value.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new DomainError(`Invalid email: ${trimmed}`)
    }
    return new Email(trimmed)
  }

  static rehydrate(value: string): Email {
    return new Email(value.toLowerCase().trim())
  }

  toString(): string {
    return this.value
  }
}
