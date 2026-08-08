import type { Email } from '../../domain/Email'
import type { User } from '../../domain/User'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  save(user: User): Promise<void>
}
