export interface SessionSnapshot {
  id: string
  tokenHash: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

export interface CreateSessionData {
  tokenHash: string
  userId: string
  expiresAt: Date
}

export class Session {
  private constructor(
    private readonly id: string,
    private readonly tokenHash: string,
    private readonly userId: string,
    private readonly expiresAt: Date,
    private readonly createdAt: Date,
  ) {}

  static rehydrate(session: SessionSnapshot): Session {
    return new Session(
      session.id,
      session.tokenHash,
      session.userId,
      session.expiresAt,
      session.createdAt,
    )
  }

  static create(id: string, data: CreateSessionData): Session {
    return new Session(id, data.tokenHash, data.userId, data.expiresAt, new Date())
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt <= now
  }

  getId(): string {
    return this.id
  }

  getTokenHash(): string {
    return this.tokenHash
  }

  getUserId(): string {
    return this.userId
  }

  getExpiresAt(): Date {
    return this.expiresAt
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  equals(other: Session): boolean {
    return this.id === other.id
  }

  toSnapshot(): SessionSnapshot {
    return {
      id: this.id,
      tokenHash: this.tokenHash,
      userId: this.userId,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
    }
  }
}
