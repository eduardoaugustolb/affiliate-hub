import { DomainError } from '@affiliate-hub/shared-kernel'
import { Email } from './Email'

export interface UserSnapshot {
  id: string
  passwordHash: string
  email: string
  name: string
}

export interface CreateUserData {
  passwordHash: string
  email: string
  name: string
}

export class User {
  private constructor(
    private readonly id: string,
    private readonly passwordHash: string,
    private readonly email: Email,
    private readonly name: string,
  ) {}

  static create(id: string, data: CreateUserData): User {
    if (data.name.trim() === '') throw new DomainError('Name cannot be empty')
    return new User(id, data.passwordHash, Email.create(data.email), data.name)
  }

  static rehydrate(user: UserSnapshot): User {
    return new User(user.id, user.passwordHash, Email.create(user.email), user.name)
  }

  getId(): string {
    return this.id
  }

  getPasswordHash(): string {
    return this.passwordHash
  }

  getEmail(): Email {
    return this.email
  }

  getName(): string {
    return this.name
  }

  equals(other: User): boolean {
    return this.id === other.id
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id,
      passwordHash: this.passwordHash,
      email: this.email.toString(),
      name: this.name,
    }
  }
}
