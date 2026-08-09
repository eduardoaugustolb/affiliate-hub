import { parseEnv } from '@affiliate-hub/config'
import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number(),
  TZ: z.string(),
})

export const env = parseEnv(envSchema, process.env)
