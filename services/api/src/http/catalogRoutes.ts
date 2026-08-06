import type {
  ApproveProductMedia,
  DeactivateProduct,
  ListProductsForCuration,
  RegisterProduct,
} from '@affiliate-hub/catalog'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from './ErrorMapper'

export interface CatalogUseCases {
  registerProduct: RegisterProduct
  approveProductMedia: ApproveProductMedia
  deactivateProduct: DeactivateProduct
  listProductsForCuration: ListProductsForCuration
}

export function registerCatalogRoutes(httpServer: HttpServer, useCases: CatalogUseCases): void {
  httpServer.post('/products', async (request, response) => {
    try {
      const output = await useCases.registerProduct.execute(request.body as never)
      response.status(201).send(output)
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.get('/products/curation', async (_request, response) => {
    try {
      const output = await useCases.listProductsForCuration.execute()
      response.status(200).send(output)
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.post('/products/:id/approve-media', async (request, response) => {
    try {
      const output = await useCases.approveProductMedia.execute({
        productId: request.params.id as string,
        ...(request.body as Record<string, unknown>),
      } as never)
      response.status(200).send(output)
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })

  httpServer.post('/products/:id/deactivate', async (request, response) => {
    try {
      const output = await useCases.deactivateProduct.execute({ productId: request.params.id as string })
      response.status(200).send(output)
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })
}
