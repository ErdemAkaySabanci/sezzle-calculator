import { describe, expect, it } from 'vitest'
import { fitWidthEm, formatEntry, formatResult } from './format'

describe('formatResult', () => {
  it.each([
    [0, '0'],
    [2.5, '2.5'],
    [-10, '-10'],
    [1234567.891, '1,234,567.891'],
    [123456789012345, '123,456,789,012,345'],
    [0.000001, '0.000001'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatResult(value)).toBe(expected)
  })

  it.each([
    [0.30000000000000004, '0.3'],
    [0.7999999999999999, '0.8'],
    [1 / 3, '0.333333333333333'],
    [2 / 3, '0.666666666666667'],
  ])('rounds binary floating-point noise in %s to 15 significant digits: %s', (value, expected) => {
    expect(formatResult(value)).toBe(expected)
  })

  it.each([
    [1e15, '1e+15'],
    [1.5e21, '1.5e+21'],
    [-1.2345678901234568e20, '-1.23456789012346e+20'],
    [1e-7, '1e-7'],
    [-2.5e-8, '-2.5e-8'],
    [Number.MAX_VALUE, '1.79769313486232e+308'],
  ])('uses exponent notation for very large or small magnitudes: %s → %s', (value, expected) => {
    expect(formatResult(value)).toBe(expected)
  })

  it('switches to exponent notation when rounding carries a value up to 1e15', () => {
    expect(formatResult(999999999999999.9)).toBe('1e+15')
  })

  it('never shows a negative zero', () => {
    expect(formatResult(-0)).toBe('0')
  })
})

describe('formatEntry', () => {
  it.each([
    ['0', '0'],
    ['1234', '1,234'],
    ['-1234.50', '-1,234.50'],
    ['12.', '12.'],
    ['-0', '-0'],
    ['-0.', '-0.'],
    ['0.000', '0.000'],
    ['123456789012345', '123,456,789,012,345'],
    ['1234.56789', '1,234.56789'],
  ])('shows typed entry %s as %s, keeping what the user typed', (entry, expected) => {
    expect(formatEntry(entry)).toBe(expected)
  })
})

describe('fitWidthEm', () => {
  // Rendered widths of the display font (system-ui / Segoe UI, tabular
  // figures, -0.02em tracking), measured in Chrome. The estimate must never be
  // narrower than reality, or the auto-sized value would overflow.
  const measured: Record<string, number> = { digit: 0.535, ',': 0.221, '.': 0.221, '-': 0.382, e: 0.511, '+': 0.674, '×': 0.674, '=': 0.674, ' ': 0.255 }
  const measuredWidth = (text: string) =>
    [...text].reduce((sum, ch) => sum + (/\d/.test(ch) ? measured.digit : measured[ch === ' ' ? ' ' : ch]), 0)

  it.each(['3,703.5', '-999,999,999,999,999', '-9.99999899999999e+21', '1,234.5 × 3 ='])(
    'never underestimates the rendered width of %j',
    (text) => {
      expect(fitWidthEm(text)).toBeGreaterThanOrEqual(measuredWidth(text))
    },
  )

  it('charges separators far less than digits, so grouped numbers are not over-shrunk', () => {
    expect(fitWidthEm('1,000,000')).toBeLessThan(fitWidthEm('100000000'))
    expect(fitWidthEm('1,000,000') - fitWidthEm('1000000')).toBeLessThan(fitWidthEm('00'))
  })

  it('fits the longest possible value in the 320px layout (240px) at the 18px floor', () => {
    expect(fitWidthEm('-1.79769313486232e+308') * 18).toBeLessThanOrEqual(240)
  })
})
