import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCompanyName, findDuplicateCompany } from './normalize.js'

describe('normalizeCompanyName', () => {
  test('lowercases', () => {
    assert.equal(normalizeCompanyName('Acme Inc'), 'acme inc')
  })

  test('trims leading/trailing whitespace', () => {
    assert.equal(normalizeCompanyName('  Acme Inc  '), 'acme inc')
  })

  test('collapses internal whitespace runs to a single space', () => {
    assert.equal(normalizeCompanyName('Acme    Inc'), 'acme inc')
    assert.equal(normalizeCompanyName('Acme\tInc\n'), 'acme inc')
  })

  test('"Acme Inc" and "acme inc " normalize identically', () => {
    assert.equal(normalizeCompanyName('Acme Inc'), normalizeCompanyName('acme inc '))
  })

  test('non-string input returns empty string rather than throwing', () => {
    assert.equal(normalizeCompanyName(undefined), '')
    assert.equal(normalizeCompanyName(null), '')
    assert.equal(normalizeCompanyName(123), '')
  })

  test('empty/whitespace-only name normalizes to empty string', () => {
    assert.equal(normalizeCompanyName(''), '')
    assert.equal(normalizeCompanyName('   '), '')
  })
})

describe('findDuplicateCompany', () => {
  const existing = [
    { id: 'c1', name: 'Acme Inc', normalized_name: 'acme inc' },
    { id: 'c2', name: 'Globex Corporation', normalized_name: 'globex corporation' },
  ]

  test('finds an exact-normalized match regardless of case/whitespace', () => {
    const match = findDuplicateCompany('  ACME    Inc ', existing)
    assert.ok(match)
    assert.equal(match.id, 'c1')
  })

  test('returns null when no normalized match exists', () => {
    assert.equal(findDuplicateCompany('Initech LLC', existing), null)
  })

  test('returns null for empty candidate name', () => {
    assert.equal(findDuplicateCompany('', existing), null)
    assert.equal(findDuplicateCompany('   ', existing), null)
  })

  test('returns null when existingCompanies is not an array', () => {
    assert.equal(findDuplicateCompany('Acme Inc', null), null)
    assert.equal(findDuplicateCompany('Acme Inc', undefined), null)
  })

  test('falls back to comparing against `name` when normalized_name is missing', () => {
    const rows = [{ id: 'c3', name: 'Umbrella Corp' }]
    const match = findDuplicateCompany('umbrella   corp', rows)
    assert.ok(match)
    assert.equal(match.id, 'c3')
  })

  test('does not match a different company with a similar-but-not-equal name', () => {
    assert.equal(findDuplicateCompany('Acme Incorporated', existing), null)
  })
})
