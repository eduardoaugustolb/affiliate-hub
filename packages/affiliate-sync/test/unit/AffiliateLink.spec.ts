import { describe, expect, it } from 'bun:test'
import { DomainError } from '@affiliate-hub/shared-kernel'
import { AffiliateLink } from '../../src/domain/AffiliateLink'

describe('AffiliateLink', () => {
  it('creates, updates and returns defensive URL and date copies', () => {
    const link = AffiliateLink.create(
      'https://example.com/product/1',
      new Date('2026-08-16T12:00:00.000Z'),
    )
    const initialUpdatedAt = link.getUpdatedAt()

    const url = link.getUrl()
    url.pathname = '/changed-outside'
    initialUpdatedAt.setFullYear(2000)

    link.update('https://example.com/product/2', new Date('2026-08-17T12:00:00.000Z'))

    expect(link.toString()).toBe('https://example.com/product/2')
    expect(link.getUrl().pathname).toBe('/product/2')
    expect(link.getUpdatedAt().getFullYear()).not.toBe(2000)
  })

  it('rehydrates a valid persisted link', () => {
    const updatedAt = new Date('2026-08-16T12:00:00.000Z')

    const link = AffiliateLink.rehydrate('http://example.com/product/1', updatedAt)

    expect(link.toString()).toBe('http://example.com/product/1')
    expect(link.getUpdatedAt()).toEqual(updatedAt)
  })

  it('rejects invalid update dates and unsupported URL protocols', () => {
    expect(() => AffiliateLink.rehydrate('https://example.com', new Date('invalid'))).toThrow(
      'Invalid updatedAt',
    )
    expect(() =>
      AffiliateLink.create('ftp://example.com', new Date('2026-08-16T12:00:00.000Z')),
    ).toThrow(DomainError)
  })
})
