import { z } from 'zod'

export const userDtoSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
})

export const authenticateUserBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict()

export const sessionResponseSchema = z.object({
  message: z.string(),
  user: userDtoSchema,
})

export const loginResponseSchema = z.object({ message: z.string() })
export type UserDto = z.infer<typeof userDtoSchema>
