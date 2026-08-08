import { DomainError } from '@affiliate-hub/shared-kernel'

export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new DomainError(`Invalid email: ${value}`)
    }
    return new Email(value)
  }

  static rehydrate(value: string): Email {
    return new Email(value)
  }

  toString(): string {
    return this.value
  }
}
