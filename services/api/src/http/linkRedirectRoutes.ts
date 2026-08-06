import type { RedirectToAffiliateLink } from '@affiliate-hub/link-redirect'
import type { HttpServer } from '@affiliate-hub/shared-kernel'
import { mapErrorToHttp } from './ErrorMapper'

export interface LinkRedirectUseCases {
  redirectToAffiliateLink: RedirectToAffiliateLink
}

export function registerLinkRedirectRoutes(httpServer: HttpServer, useCases: LinkRedirectUseCases): void {
  httpServer.get('/p/:id', async (request, response) => {
    try {
      const output = await useCases.redirectToAffiliateLink.execute({ id: request.params.id as string })
      response.redirect(output.url)
    } catch (error) {
      mapErrorToHttp(error, response)
    }
  })
}
