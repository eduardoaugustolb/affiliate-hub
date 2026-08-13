export interface KeyedHasher {
  hash(data: string): Promise<string>
}
