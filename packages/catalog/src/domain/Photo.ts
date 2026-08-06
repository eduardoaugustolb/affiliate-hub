export class Photo {
  private constructor(
    private readonly url: string,
    private readonly approved: boolean,
  ) {}

  static create(url: string): Photo {
    return new Photo(url, false)
  }

  static rehydrate(url: string, approved: boolean): Photo {
    return new Photo(url, approved)
  }

  approve(): Photo {
    return new Photo(this.url, true)
  }

  isApproved(): boolean {
    return this.approved
  }

  getUrl(): string {
    return this.url
  }
}
