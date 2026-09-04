import type {
  ApproveProductMedia,
  DeactivateProduct,
  ListProductsForCuration,
  RegisterManualProduct,
  RegisterProduct,
} from '@affiliate-hub/catalog'
import {
  approveProductMediaBodySchema,
  productCreatedResponseSchema,
  productIdParamsSchema,
  productMutationResponseSchema,
  productsResponseSchema,
  registerProductBodySchema,
} from '@affiliate-hub/contracts'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from '../ErrorMapper'
import { parse } from '../parse'

export interface CatalogUseCases {
  registerProduct: RegisterProduct
  registerManualProduct?: RegisterManualProduct
  approveProductMedia: ApproveProductMedia
  deactivateProduct: DeactivateProduct
  listProductsForCuration: ListProductsForCuration
}

export function registerCatalogRoutes(httpServer: HttpServer, useCases: CatalogUseCases): void {
  httpServer.post('/products', async (request, response) => {
    try {
      const input = parse(registerProductBodySchema, request.body)
      let output: { productId: string }
      if (input.productUrl !== undefined) {
        if (!useCases.registerManualProduct) {
          throw new Error('Manual product registration is not configured')
        }
        output = await useCases.registerManualProduct.execute({
          name: input.name,
          category: input.category,
          productUrl: input.productUrl,
        })
      } else {
        output = await useCases.registerProduct.execute(input)
      }
      response.status(201).sendJson(
        parse(productCreatedResponseSchema, {
          message: 'Product created successfully',
          ...output,
        }),
      )
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.get('/products/curation', async (_request, response) => {
    try {
      const { products } = await useCases.listProductsForCuration.execute()
      const dto = products.map((product) => ({
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        removedAt: product.removedAt?.toISOString() ?? null,
      }))
      response.status(200).sendJson(
        parse(productsResponseSchema, {
          message: 'Products retrieved successfully',
          products: dto,
        }),
      )
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.post('/products/:id/approve-media', async (request, response) => {
    try {
      const { id } = parse(productIdParamsSchema, request.params)
      const body = parse(approveProductMediaBodySchema, request.body)
      const output = await useCases.approveProductMedia.execute({ productId: id, ...body })
      response.status(200).sendJson(
        parse(productMutationResponseSchema, {
          message: 'Product media approved successfully',
          ...output,
        }),
      )
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.post('/products/:id/deactivate', async (request, response) => {
    try {
      const { id } = parse(productIdParamsSchema, request.params)
      const output = await useCases.deactivateProduct.execute({ productId: id })
      response.status(200).sendJson(
        parse(productMutationResponseSchema, {
          message: 'Product deactivated successfully',
          ...output,
        }),
      )
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })
}
