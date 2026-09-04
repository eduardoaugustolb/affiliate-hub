import type { z } from 'zod'

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  return schema.parse(value)
}
