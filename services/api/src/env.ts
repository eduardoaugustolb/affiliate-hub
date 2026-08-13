import { parseEnv } from '@affiliate-hub/config'
import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number(),
  TZ: z.string(),
  PII_ENCRYPTION_KEY: z.string(),
  EMAIL_LOOKUP_HMAC_KEY: z.string(),
  SESSION_TOKEN_HMAC_KEY: z.string(),
})

export const env = parseEnv(envSchema, process.env)
