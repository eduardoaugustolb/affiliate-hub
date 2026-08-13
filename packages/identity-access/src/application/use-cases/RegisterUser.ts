import type { IdGenerator, UseCase } from '@affiliate-hub/shared-kernel'
import { Email } from '../../domain/Email'
import { User } from '../../domain/User'
import { UserAlreadyExistsError } from '../errors/UserAlreadyExistsError'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { UserRepository } from '../ports/UserRepository'

export interface RegisterUserInput {
  name: string
  email: string
  password: string
}

export class RegisterUser implements UseCase<RegisterUserInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: RegisterUserInput): Promise<void> {
    const userExists = await this.userRepository.findByEmail(Email.create(input.email))
    if (userExists) throw new UserAlreadyExistsError('User already exists')

    const user = User.create(this.idGenerator.generate(), {
      name: input.name,
      email: input.email,
      passwordHash: await this.passwordHasher.hash(input.password),
    })
    await this.userRepository.save(user)
  }
}
