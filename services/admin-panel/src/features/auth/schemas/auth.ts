import { z } from 'zod'

export const setupSchema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório'),
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'A senha é obrigatória'),
})

export type SetupInput = z.infer<typeof setupSchema>
export type LoginInput = z.infer<typeof loginSchema>
