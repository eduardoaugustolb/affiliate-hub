import { productIdParamsSchema } from '@affiliate-hub/contracts'
import type { RedirectToAffiliateLink } from '@affiliate-hub/link-redirect'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from '../ErrorMapper'
import { parse } from '../parse'

export interface LinkRedirectUseCases {
  redirectToAffiliateLink: RedirectToAffiliateLink
}

export function registerLinkRedirectRoutes(
  httpServer: HttpServer,
  useCases: LinkRedirectUseCases,
): void {
  httpServer.get('/p/:id', async (request, response) => {
    try {
      const { id } = parse(productIdParamsSchema, request.params)
      const output = await useCases.redirectToAffiliateLink.execute({ id })
      response.redirect(output.url)
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })
}
