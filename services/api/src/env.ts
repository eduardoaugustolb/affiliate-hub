import { parseEnv } from '@affiliate-hub/config'
import { z } from 'zod'

export const envSchema = z
  .object({
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
    PORT: z.coerce.number().default(3000),
    TZ: z.string(),
    PII_ENCRYPTION_KEY: z.string(),
    EMAIL_LOOKUP_HMAC_KEY: z.string(),
    SESSION_TOKEN_HMAC_KEY: z.string(),
    SHOPEE_AFFILIATE_API_URL: z.url().optional(),
    SHOPEE_AFFILIATE_CREDENTIAL: z.string().min(1).optional(),
    SHOPEE_AFFILIATE_SECRET: z.string().min(1).optional(),
    SHOPEE_AFFILIATE_PRODUCT_URL_TEMPLATE: z.string().url().optional(),
  })
  .superRefine((value, context) => {
    const fields = [
      'SHOPEE_AFFILIATE_API_URL',
      'SHOPEE_AFFILIATE_CREDENTIAL',
      'SHOPEE_AFFILIATE_SECRET',
      'SHOPEE_AFFILIATE_PRODUCT_URL_TEMPLATE',
    ] as const
    const configured = fields.filter((field) => value[field] !== undefined)

    if (configured.length > 0 && configured.length !== fields.length) {
      context.addIssue({
        code: 'custom',
        message:
          'Shopee Affiliate configuration requires API URL, credential, secret, and product URL template together',
      })
    }

    if (
      value.SHOPEE_AFFILIATE_PRODUCT_URL_TEMPLATE &&
      !value.SHOPEE_AFFILIATE_PRODUCT_URL_TEMPLATE.includes('{externalProductId}')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SHOPEE_AFFILIATE_PRODUCT_URL_TEMPLATE'],
        message: 'must include {externalProductId}',
      })
    }
  })

export const env = parseEnv(envSchema, process.env)
