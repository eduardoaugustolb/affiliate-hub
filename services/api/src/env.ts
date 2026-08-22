import { parseEnv } from '@affiliate-hub/config'
import { z } from 'zod'

export const envSchema = z
  .object({
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
    PORT: z.coerce.number().default(3000),
    WORKER_METRICS_PORT: z.coerce.number().int().min(1).max(65535).default(9464),
    TZ: z.string(),
    PII_ENCRYPTION_KEY: z.string(),
    EMAIL_LOOKUP_HMAC_KEY: z.string(),
    SESSION_TOKEN_HMAC_KEY: z.string(),
    SHOPEE_APP_ID: z.string().min(1).optional(),
    SHOPEE_PASSWORD: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    const fields = ['SHOPEE_APP_ID', 'SHOPEE_PASSWORD'] as const
    const configured = fields.filter((field) => value[field] !== undefined)

    if (configured.length > 0 && configured.length !== fields.length) {
      context.addIssue({
        code: 'custom',
        message: 'Shopee Affiliate configuration requires app ID and password together',
      })
    }
  })

export const env = parseEnv(envSchema, process.env)
