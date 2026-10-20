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
  // Rendered widths in em (with the display's -0.02em tracking), measured in
  // Chrome for both fonts the display can render in. The estimate must never be
  // narrower than either, or the auto-sized value would overflow.
  const fonts: Record<string, Record<string, number>> = {
    // The brand face, Schibsted Grotesk, with proportional figures (as set in the display).
    'Schibsted Grotesk': {
      '0': 0.618, '1': 0.34, '2': 0.569, '3': 0.58, '4': 0.589, '5': 0.584, '6': 0.6, '7': 0.537, '8': 0.596, '9': 0.601,
      ',': 0.252, '.': 0.23, '-': 0.411, e: 0.571, '+': 0.577, '×': 0.615, '=': 0.602, ' ': 0.222, ' ': 0.222,
    },
    // The fallback system font (Segoe UI) if the web font has not loaded; tabular figures.
    'Segoe UI fallback': {
      '0': 0.535, '1': 0.535, '2': 0.535, '3': 0.535, '4': 0.535, '5': 0.535, '6': 0.535, '7': 0.535, '8': 0.535, '9': 0.535,
      ',': 0.221, '.': 0.221, '-': 0.382, e: 0.511, '+': 0.674, '×': 0.674, '=': 0.674, ' ': 0.255, ' ': 0.255,
    },
  }
  const samples = ['3,703.5', '900,000,000,000,000', '0.000001', '-999,999,999,999,999', '-9.99999899999999e+21', '1,000,000,000,000', '1,234.5 × 3 =']

  for (const [font, widths] of Object.entries(fonts)) {
    it.each(samples)(`never underestimates the rendered width of %j in ${font}`, (text) => {
      const measured = [...text].reduce((sum, ch) => sum + widths[ch], 0)
      expect(fitWidthEm(text)).toBeGreaterThanOrEqual(measured)
    })
  }

  it('charges separators far less than digits, so grouped numbers are not over-shrunk', () => {
    expect(fitWidthEm('1,000,000')).toBeLessThan(fitWidthEm('100000000'))
    expect(fitWidthEm('1,000,000') - fitWidthEm('1000000')).toBeLessThan(fitWidthEm('00'))
  })

  it('fits the longest possible value in the 320px layout (240px) at the 17px floor', () => {
    expect(fitWidthEm('-1.79769313486232e+308') * 17).toBeLessThanOrEqual(240)
  })
})
