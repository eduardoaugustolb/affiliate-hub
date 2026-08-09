import type { z } from 'zod'

export function parseEnv<Schema extends z.ZodType>(
  schema: Schema,
  source: Record<string, string | undefined> = process.env,
): z.infer<Schema> {
  const parseResult = schema.safeParse(source)

  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map((issue) => {
        const field = issue.path.join('.') || 'unknown'
        return `- ${field}: ${issue.message}`
      })
      .join('\n')
    throw new Error(`Invalid environment variables:\n${errors}`)
  }

  return parseResult.data
}
