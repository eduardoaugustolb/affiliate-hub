import { z } from 'zod'

export const apiMessageSchema = z.object({ message: z.string() })
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export type ApiError = z.infer<typeof apiErrorSchema>
