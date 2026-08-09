import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { parseEnv } from '../src/index'

describe('parseEnv', () => {
  const schema = z.object({
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().int().positive(),
  })

  it('faz o parse e coerção das variáveis válidas', () => {
    const result = parseEnv(schema, {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      PORT: '3000',
    })

    expect(result).toEqual({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      PORT: 3000,
    })
  })

  it('lança erro descritivo quando uma variável obrigatória está ausente', () => {
    expect(() =>
      parseEnv(schema, {
        PORT: '3000',
      }),
    ).toThrow(/DATABASE_URL/)
  })

  it('lança erro descritivo quando uma variável tem formato inválido', () => {
    expect(() =>
      parseEnv(schema, {
        DATABASE_URL: 'not-a-valid-url',
        PORT: '3000',
      }),
    ).toThrow(/DATABASE_URL/)
  })

  it('não engole erros de outra natureza (ex: schema chamado sem source em ambiente sem env vars)', () => {
    const emptySchema = z.object({})

    expect(parseEnv(emptySchema, {})).toEqual({})
  })

  it('usa process.env como fonte padrão quando source não é informado', () => {
    process.env.TEST_ONLY_VAR = 'hello'

    const result = parseEnv(z.object({ TEST_ONLY_VAR: z.string() }))

    expect(result).toEqual({ TEST_ONLY_VAR: 'hello' })

    delete process.env.TEST_ONLY_VAR
  })

  it('agrega todos os erros de validação em uma única mensagem', () => {
    const multiFieldSchema = z.object({
      DATABASE_URL: z.string().url(),
      PORT: z.coerce.number().int().positive(),
    })

    try {
      parseEnv(multiFieldSchema, {})
      throw new Error('deveria ter lançado')
    } catch (error) {
      const message = (error as Error).message
      expect(message).toMatch(/DATABASE_URL/)
      expect(message).toMatch(/PORT/)
    }
  })
})
