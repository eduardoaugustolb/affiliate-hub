import type { UserRepository } from '../../../src/application/ports/UserRepository'
import type { Email } from '../../../src/domain/Email'
import type { User } from '../../../src/domain/User'

export class UserRepositoryFake implements UserRepository {
  private readonly users = new Map<string, User>()

  async save(user: User): Promise<void> {
    this.users.set(user.getId(), user)
  }

  async hasAnyUser(): Promise<boolean> {
    return this.users.size > 0
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.getEmail().toString() === email.toString()) {
        return user
      }
    }
    return null
  }

  async updateById(user: User): Promise<void> {
    this.users.set(user.getId(), user)
  }

  async deleteById(id: string): Promise<void> {
    this.users.delete(id)
  }
}
