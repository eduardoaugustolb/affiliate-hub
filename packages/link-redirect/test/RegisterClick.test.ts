import { describe, expect, it } from 'bun:test'
import { RegisterClick } from '../src/application/use-cases/RegisterClick'
import { ClickLogFake } from './doubles/ClickLogFake'

describe('RegisterClick', () => {
  it('registers a click for the given product', async () => {
    const clickLog = new ClickLogFake()
    const useCase = new RegisterClick(clickLog)

    await useCase.execute({ productId: 'BBA-QES-MZN' })

    expect(clickLog.registered).toHaveLength(1)
    expect(clickLog.registered[0]?.productId).toBe('BBA-QES-MZN')
  })
})
