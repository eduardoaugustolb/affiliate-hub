import { describe, expect, it } from 'bun:test'
import { NotFoundError } from '@affiliate-hub/shared-kernel'
import { RedirectToAffiliateLink } from '../../src/application/use-cases/RedirectToAffiliateLink'
import { ClickLogFake } from './doubles/ClickLogFake'
import { PublishedProductReaderFake } from './doubles/PublishedProductReaderFake'

const clock = { now: () => new Date('2026-08-20T12:00:00.000Z') }

describe('RedirectToAffiliateLink', () => {
  it('resolves the current affiliate link and registers a click', async () => {
    const publishedProductReader = new PublishedProductReaderFake()
    const clickLog = new ClickLogFake()
    publishedProductReader.links.set('PRODUCT-1', 'https://example.com/link')

    const useCase = new RedirectToAffiliateLink(publishedProductReader, clock, clickLog)
    const output = await useCase.execute({ id: 'PRODUCT-1' })

    expect(output.url).toBe('https://example.com/link')
    expect(clickLog.registered).toHaveLength(1)
    expect(clickLog.registered[0]?.productId).toBe('PRODUCT-1')
  })

  it('throws NotFoundError when the product is not published', async () => {
    const useCase = new RedirectToAffiliateLink(
      new PublishedProductReaderFake(),
      clock,
      new ClickLogFake(),
    )

    await expect(useCase.execute({ id: 'MISSING-ID' })).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when the published product has no current affiliate link', async () => {
    const publishedProductReader = new PublishedProductReaderFake()
    const clickLog = new ClickLogFake()
    const useCase = new RedirectToAffiliateLink(publishedProductReader, clock, clickLog)

    await expect(useCase.execute({ id: 'PRODUCT-2' })).rejects.toThrow(NotFoundError)
    expect(clickLog.registered).toHaveLength(0)
  })
})
