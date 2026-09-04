import { z } from 'zod'
import { userDtoSchema } from './auth'

export const userIdParamsSchema = z.object({ id: z.string().min(1) })
export const updateUserBodySchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((body) => body.email !== undefined || body.name !== undefined, {
    message: 'Name or email is required',
  })

export const userResponseSchema = z.object({ message: z.string(), user: userDtoSchema })
export const deleteUserResponseSchema = z.object({ message: z.string() })
