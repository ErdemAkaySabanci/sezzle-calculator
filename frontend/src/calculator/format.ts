// Display formatting only. Values are rounded for presentation here, never
// for further calculation: the raw API result is what gets sent next.

/** float64 reliably round-trips 15 significant decimal digits. */
const SIGNIFICANT_DIGITS = 15
const EXPONENT_ABOVE = 1e15
const EXPONENT_BELOW = 1e-6

const decimalFormat = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: SIGNIFICANT_DIGITS,
})

/** Formats an API result, hiding binary floating-point noise such as 0.30000000000000004. */
export function formatResult(value: number): string {
  // Rounding can push a value across a threshold (999999999999999.9 → 1e15)
  // or past the float64 maximum (Number.MAX_VALUE → Infinity), so the rounded
  // magnitude decides the notation but is never used as the displayed value.
  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS))
  if (rounded === 0) return '0'

  const magnitude = Math.abs(rounded)
  if (magnitude >= EXPONENT_ABOVE || magnitude < EXPONENT_BELOW) {
    return trimMantissa(value.toExponential(SIGNIFICANT_DIGITS - 1))
  }
  return decimalFormat.format(rounded)
}

/** "1.50000000000000e+21" → "1.5e+21", "1.00000000000000e+15" → "1e+15" */
function trimMantissa(exponential: string): string {
  return exponential.replace(/\.?0+e/, 'e')
}

/**
 * Estimated rendered width of display text in em, used to size it to fit.
 * Separators are much narrower than digits, so counting characters would
 * over-shrink grouped numbers. Each weight sits just above the widest glyph
 * measured in the brand face (Archivo, including the result's 112% width)
 * and the system-font fallback, so the text fits whichever one renders.
 */
export function fitWidthEm(text: string): number {
  let width = 0
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') width += 0.65
    else if (ch === ',' || ch === '.' || ch === ' ' || ch === ' ') width += 0.3
    else if (ch === '-') width += 0.45
    else if (ch === '%') width += 1
    else width += 0.7 // e, +, operator symbols, =
  }
  return width
}

/** Formats a number as the user is typing it: digits are grouped, nothing else changes. */
export function formatEntry(entry: string): string {
  const [integer, fraction] = entry.split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}
