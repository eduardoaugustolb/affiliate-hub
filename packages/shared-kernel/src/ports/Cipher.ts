export interface Cipher {
  encrypt(plaintext: string): Promise<{
    ciphertext: string
    iv: string
    authTag: string
  }>
  decrypt(ciphertext: string, iv: string, authTag: string): Promise<string>
}
