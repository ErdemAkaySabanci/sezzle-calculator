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
  // Rendered widths in em, measured in Chrome for each style the display can
  // render. The estimate must never be narrower than any of them, or the
  // auto-sized text would overflow.
  const fonts: Record<string, Record<string, number>> = {
    // The result: Archivo 500 at 112% width, -0.02em tracking, proportional figures.
    'Archivo, result': {
      '0': 0.64, '1': 0.58, '2': 0.63, '3': 0.64, '4': 0.62, '5': 0.64, '6': 0.64, '7': 0.59, '8': 0.64, '9': 0.64,
      ',': 0.27, '.': 0.27, '-': 0.35, e: 0.62, '+': 0.65, '×': 0.65, '=': 0.65, ' ': 0.24, ' ': 0.24,
      '÷': 0.65, '−': 0.65, '^': 0.65, '%': 0.99, '√': 0.53, o: 0.63, f: 0.33,
    },
    // The expression line: Archivo 400 at normal width.
    'Archivo, expression': {
      '0': 0.57, '1': 0.52, '2': 0.57, '3': 0.57, '4': 0.56, '5': 0.57, '6': 0.57, '7': 0.54, '8': 0.57, '9': 0.57,
      ',': 0.28, '.': 0.28, '-': 0.33, e: 0.55, '+': 0.63, '×': 0.63, '=': 0.63, ' ': 0.21, ' ': 0.21,
      '÷': 0.63, '−': 0.63, '^': 0.63, '%': 0.95, '√': 0.55, o: 0.57, f: 0.27,
    },
    // The fallback system font (Segoe UI) if the web font has not loaded; tabular figures.
    'Segoe UI fallback': {
      '0': 0.535, '1': 0.535, '2': 0.535, '3': 0.535, '4': 0.535, '5': 0.535, '6': 0.535, '7': 0.535, '8': 0.535, '9': 0.535,
      ',': 0.221, '.': 0.221, '-': 0.382, e: 0.511, '+': 0.674, '×': 0.674, '=': 0.674, ' ': 0.255, ' ': 0.255,
      '÷': 0.67, '−': 0.67, '^': 0.67, '%': 0.82, '√': 0.63, o: 0.58, f: 0.32,
    },
  }
  const samples = ['3,703.5', '900,000,000,000,000', '0.000001', '-999,999,999,999,999', '-9.99999899999999e+21', '1,000,000,000,000', '1,234.5 × 3 =',
    // Expression lines of the Stage 8 operations.
    '20% of 150 =', '100% of 100%', '2 ^ 10 =', '√1,234.5 =', '9 ÷ √81', '5 − 3']

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
