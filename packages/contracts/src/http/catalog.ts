import { z } from 'zod'

export const productIdParamsSchema = z.object({ id: z.string().min(1) })
export const registerProductBodySchema = z
  .object({
    name: z.string().trim().min(1),
    category: z.enum(['streetwear', 'perfume']),
    productUrl: z.string().trim().min(1).optional(),
  })
  .strict()
export const approveProductMediaBodySchema = z
  .object({
    photoUrl: z.string().url(),
    templateId: z.string().min(1).optional(),
    tryActivate: z.boolean().optional(),
  })
  .strict()
export const productCreatedResponseSchema = z.object({ message: z.string(), productId: z.string() })
export const productMutationResponseSchema = z.object({
  message: z.string(),
  productId: z.string(),
  status: z.string().optional(),
})
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['streetwear', 'perfume']),
  status: z.string(),
  mediaType: z.string().nullable(),
  assignedTemplate: z.string().nullable(),
  photos: z.array(z.object({ url: z.string(), approved: z.boolean() })),
  affiliateLinkUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  removedAt: z.string().datetime().nullable(),
})
export const productsResponseSchema = z.object({
  message: z.string(),
  products: z.array(productSchema),
})
