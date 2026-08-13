export class Argon2Hasher {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, {
      algorithm: 'argon2id',
      memoryCost: 1024,
      timeCost: 1,
    })
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash, 'argon2id')
  }
}
