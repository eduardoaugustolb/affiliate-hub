import { describe, expect, it } from 'bun:test'
import { RegisterClick } from '../../src/application/use-cases/RegisterClick'
import { ClickLogFake } from './doubles/ClickLogFake'

const clock = { now: () => new Date('2026-08-20T12:00:00.000Z') }

describe('RegisterClick', () => {
  it('registers a click for the given product', async () => {
    const clickLog = new ClickLogFake()
    const useCase = new RegisterClick(clickLog, clock)

    await useCase.execute({ productId: 'BBA-QES-MZN' })

    expect(clickLog.registered).toHaveLength(1)
    expect(clickLog.registered[0]?.productId).toBe('BBA-QES-MZN')
  })
})
