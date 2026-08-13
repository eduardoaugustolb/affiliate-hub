import type { Cipher, DatabaseConnection, KeyedHasher } from '@affiliate-hub/shared-kernel'
import type { UserRepository } from '../application/ports/UserRepository'
import type { Email } from '../domain/Email'
import { User } from '../domain/User'

interface UserRow {
  id: string
  password_hash: string
  email_encrypted: string
  email_iv: string
  email_auth_tag: string
  name: string
}

export class UserRepositorySql implements UserRepository {
  constructor(
    private readonly db: DatabaseConnection,
    private readonly cipher: Cipher,
    private readonly keyedHasher: KeyedHasher,
  ) {}

  async deleteById(id: string): Promise<void> {
    await this.db.query('delete from users where id = $1', [id])
  }

  async findByEmail(email: Email): Promise<User | null> {
    const emailLookupHash = await this.keyedHasher.hash(email.toString())

    const result = await this.db.query(
      'select id, password_hash, email_encrypted, email_iv, email_auth_tag, name from users where email_lookup_hash = $1',
      [emailLookupHash],
    )

    if (result.length === 0) return null

    const user = result[0] as UserRow

    const decryptedEmail = await this.cipher.decrypt(
      user.email_encrypted,
      user.email_iv,
      user.email_auth_tag,
    )

    return User.rehydrate({
      id: user.id,
      passwordHash: user.password_hash,
      email: decryptedEmail,
      name: user.name,
    })
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(
      'select id, password_hash, email_encrypted, email_iv, email_auth_tag, name from users where id = $1',
      [id],
    )
    if (result.length === 0) return null

    const user = result[0] as UserRow

    const decryptedEmail = await this.cipher.decrypt(
      user.email_encrypted,
      user.email_iv,
      user.email_auth_tag,
    )

    return User.rehydrate({
      id: user.id,
      passwordHash: user.password_hash,
      email: decryptedEmail,
      name: user.name,
    })
  }

  async save(user: User): Promise<void> {
    const emailEncrypted = await this.cipher.encrypt(user.getEmail().toString())
    const emailLookupHash = await this.keyedHasher.hash(user.getEmail().toString())

    await this.db.query(
      'insert into users (id, password_hash, email_encrypted, email_iv, email_auth_tag, email_lookup_hash, name) values ($1, $2, $3, $4, $5, $6, $7)',
      [
        user.getId(),
        user.getPasswordHash(),
        emailEncrypted.ciphertext,
        emailEncrypted.iv,
        emailEncrypted.authTag,
        emailLookupHash,
        user.getName(),
      ],
    )
  }

  async updateById(user: User): Promise<void> {
    const emailEncrypted = await this.cipher.encrypt(user.getEmail().toString())
    const emailLookupHash = await this.keyedHasher.hash(user.getEmail().toString())

    await this.db.query(
      'update users set password_hash = $1, email_encrypted = $2, email_iv = $3, email_auth_tag = $4, email_lookup_hash = $5, name = $6 where id = $7',
      [
        user.getPasswordHash(),
        emailEncrypted.ciphertext,
        emailEncrypted.iv,
        emailEncrypted.authTag,
        emailLookupHash,
        user.getName(),
        user.getId(),
      ],
    )
  }
}
