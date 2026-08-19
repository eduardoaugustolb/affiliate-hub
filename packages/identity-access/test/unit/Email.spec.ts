import { describe, expect, it } from 'bun:test'
import { DomainError } from '@affiliate-hub/shared-kernel'
import { Email } from '../../src/domain/Email'

describe('Email', () => {
  it('normalizes case', () => {
    expect(Email.create('Jane@Example.COM').toString()).toBe('jane@example.com')
  })

  it('normalizes surrounding whitespace', () => {
    expect(Email.create('  jane@example.com  ').toString()).toBe('jane@example.com')
  })

  it('treats differently-cased emails as equal', () => {
    const a = Email.create('Jane@Example.com')
    const b = Email.create('jane@example.com')
    expect(a.toString()).toBe(b.toString())
  })

  it('throws DomainError for a value without "@"', () => {
    expect(() => Email.create('jane.example.com')).toThrow(DomainError)
  })

  it('throws DomainError for a value without a domain', () => {
    expect(() => Email.create('jane@example')).toThrow(DomainError)
  })

  it('rehydrate also normalizes case and whitespace', () => {
    expect(Email.rehydrate('Jane@Example.COM').toString()).toBe('jane@example.com')
  })
})
