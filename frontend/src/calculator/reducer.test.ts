import { describe, expect, it } from 'vitest'
import {
  type CalculatorAction,
  type CalculatorState,
  type Digit,
  calculatorReducer,
  displayValue,
  expressionLine,
  initialState,
} from './reducer'

/** Applies keypad input. Tokens: digits, '.', '±', '⌫', 'AC', '+', '-', '*', '/', '='. */
function press(keys: string, state: CalculatorState = initialState): CalculatorState {
  return keys.split(' ').filter(Boolean).reduce((s, key) => calculatorReducer(s, toAction(key)), state)
}

function toAction(key: string): CalculatorAction {
  switch (key) {
    case '.': return { type: 'decimal' }
    case '±': return { type: 'toggleSign' }
    case '⌫': return { type: 'backspace' }
    case 'AC': return { type: 'clear' }
    case '=': return { type: 'equals' }
    case '+': return { type: 'operator', operator: 'add' }
    case '-': return { type: 'operator', operator: 'subtract' }
    case '*': return { type: 'operator', operator: 'multiply' }
    case '/': return { type: 'operator', operator: 'divide' }
    default:
      if (/^\d$/.test(key)) return { type: 'digit', digit: key as Digit }
      throw new Error(`unknown key ${key}`)
  }
}

function resolve(state: CalculatorState, result: number, durationMs = 0): CalculatorState {
  if (!state.pending) throw new Error('no pending calculation to resolve')
  return calculatorReducer(state, { type: 'resolved', id: state.pending.id, result, durationMs })
}

function fail(state: CalculatorState, message: string): CalculatorState {
  if (!state.pending) throw new Error('no pending calculation to fail')
  return calculatorReducer(state, { type: 'failed', id: state.pending.id, message })
}

describe('entering a number', () => {
  it('starts at 0 with nothing pending', () => {
    expect(displayValue(initialState)).toBe('0')
    expect(initialState.pending).toBeNull()
    expect(initialState.error).toBeNull()
  })

  it.each([
    ['1 2 3', '123'],
    ['0 0 5', '5'],
    ['1 . 5', '1.5'],
    ['1 . 5 . 2', '1.52'],
    ['.', '0.'],
    ['. 0 5', '0.05'],
    ['1 2 3 4 . 5 0', '1,234.50'],
  ])('keys "%s" display %s', (keys, expected) => {
    expect(displayValue(press(keys))).toBe(expected)
  })

  it('accepts at most 15 digits', () => {
    expect(displayValue(press('9 '.repeat(16)))).toBe('999,999,999,999,999')
    expect(displayValue(press('0 . ' + '1 '.repeat(15)))).toBe('0.' + '1'.repeat(14))
  })

  it.each([
    ['5 ±', '-5'],
    ['5 ± ±', '5'],
    ['±', '-0'],
    ['± 5', '-5'],
    ['± . 5', '-0.5'],
  ])('sign toggle: keys "%s" display %s', (keys, expected) => {
    expect(displayValue(press(keys))).toBe(expected)
  })

  it.each([
    ['1 2 3 ⌫', '12'],
    ['5 ⌫', '0'],
    ['± 5 ⌫', '0'],
    ['1 . ⌫', '1'],
  ])('backspace: keys "%s" display %s', (keys, expected) => {
    expect(displayValue(press(keys))).toBe(expected)
  })

  it('AC resets the entry and forgets the stored operand and operator', () => {
    const state = press('1 2 + 3 AC')

    expect(displayValue(state)).toBe('0')
    expect(press('5 =', state).pending).toBeNull()
  })
})

describe('operators', () => {
  it('stores the first operand and keeps showing it until the next is typed', () => {
    const state = press('1 2 +')

    expect(state.pending).toBeNull()
    expect(displayValue(state)).toBe('12')
    expect(displayValue(press('3', state))).toBe('3')
  })

  it('replaces the operator when two are pressed in a row, without calling the API', () => {
    const state = press('2 + *')

    expect(state.pending).toBeNull()
    expect(press('3 =', state).pending).toMatchObject({ operation: 'multiply', a: 2, b: 3 })
  })

  it('= requests the calculation from the API', () => {
    expect(press('2 + 3 =').pending).toMatchObject({ operation: 'add', a: 2, b: 3 })
  })

  it('sends negative and decimal operands as numbers', () => {
    expect(press('± 2 . 5 * 4 ± =').pending).toMatchObject({ operation: 'multiply', a: -2.5, b: -4 })
  })

  it('treats a trailing decimal point as a whole number', () => {
    expect(press('5 . / 2 =').pending).toMatchObject({ operation: 'divide', a: 5, b: 2 })
  })

  it('a decimal point after an operator starts the second operand at 0.', () => {
    const state = press('2 + .')

    expect(displayValue(state)).toBe('0.')
    expect(press('5 =', state).pending).toMatchObject({ operation: 'add', a: 2, b: 0.5 })
  })

  it('± after an operator starts a negative second operand', () => {
    const state = press('2 + ±')

    expect(displayValue(state)).toBe('-0')
    expect(press('3 =', state).pending).toMatchObject({ operation: 'add', a: 2, b: -3 })
  })

  it.each([
    ['without an operator', '5 ='],
    ['without a second operand', '2 + ='],
  ])('= does nothing %s', (_label, keys) => {
    expect(press(keys).pending).toBeNull()
  })
})

describe('results', () => {
  it('displays the formatted result and starts a new number on the next digit', () => {
    const state = resolve(press('1 + 2 ='), 0.30000000000000004)

    expect(displayValue(state)).toBe('0.3')
    expect(state.pending).toBeNull()
    expect(displayValue(press('7', state))).toBe('7')
  })

  it('chains with the raw result, not the rounded display value', () => {
    const state = resolve(press('1 + 2 ='), 0.30000000000000004)

    expect(press('+ 1 =', state).pending).toMatchObject({ operation: 'add', a: 0.30000000000000004, b: 1 })
  })

  it('evaluates a pending operation before applying the next operator (2 + 3 × 4 = 20)', () => {
    let state = press('2 + 3 *')
    expect(state.pending).toMatchObject({ operation: 'add', a: 2, b: 3 })

    state = resolve(state, 5)
    expect(displayValue(state)).toBe('5')

    state = press('4 =', state)
    expect(state.pending).toMatchObject({ operation: 'multiply', a: 5, b: 4 })
  })

  it('± negates a result in place; backspace cannot edit it', () => {
    const state = resolve(press('2 + 3 ='), 5)

    expect(displayValue(press('±', state))).toBe('-5')
    expect(displayValue(press('⌫', state))).toBe('5')
  })

  it('shows very large results in exponent notation', () => {
    expect(displayValue(resolve(press('1 * 1 ='), 1.5e21))).toBe('1.5e+21')
  })
})

describe('expression line', () => {
  it.each([
    ['', ''],
    ['1 2', ''],
    ['1 2 +', '12 +'],
    ['9 -', '9 −'],
    ['9 *', '9 ×'],
    ['9 /', '9 ÷'],
    ['1 2 3 4 * ± 2 . 5', '1,234 ×'],
  ])('keys "%s" show "%s"', (keys, expected) => {
    expect(expressionLine(press(keys))).toBe(expected)
  })

  it('shows the full calculation while it is pending', () => {
    expect(expressionLine(press('1 2 3 4 * ± 2 . 5 ='))).toBe('1,234 × -2.5 =')
    expect(expressionLine(press('2 + 3 *'))).toBe('2 + 3')
  })

  it('keeps the completed calculation above its result until the next input', () => {
    const result = resolve(press('2 + 3 ='), 5)

    expect(expressionLine(result)).toBe('2 + 3 =')
    expect(expressionLine(press('7', result))).toBe('')
    expect(expressionLine(press('±', result))).toBe('')
  })

  it('shows the carried result and next operator after a chained step', () => {
    expect(expressionLine(resolve(press('2 + 3 *'), 5))).toBe('5 ×')
  })
})

describe('last calculation', () => {
  it('records the completed calculation with the API response time', () => {
    const result = resolve(press('2 + 3 ='), 5, 12)

    expect(result.lastCalculation).toEqual({ operation: 'add', a: 2, b: 3, result: 5, durationMs: 12 })
  })

  it('is cleared by the next input', () => {
    expect(press('7', resolve(press('2 + 3 ='), 5)).lastCalculation).toBeNull()
  })
})

describe('while a calculation is pending', () => {
  it('ignores every key except AC', () => {
    const pending = press('2 + 3 =')

    for (const key of ['1', '.', '±', '⌫', '+', '=']) {
      expect(press(key, pending)).toBe(pending)
    }
  })

  it('AC cancels it, and its late response is ignored', () => {
    const pending = press('2 + 3 =')
    const cleared = press('AC', pending)
    const late = calculatorReducer(cleared, { type: 'resolved', id: pending.pending!.id, result: 5, durationMs: 0 })

    expect(cleared.pending).toBeNull()
    expect(late).toBe(cleared)
  })

  it('gives the next request a new id after AC, so a cancelled response cannot complete it', () => {
    const cancelled = press('2 + 3 =')
    const next = press('AC 4 + 5 =', cancelled)
    const late = calculatorReducer(next, { type: 'resolved', id: cancelled.pending!.id, result: 5, durationMs: 0 })

    expect(next.pending!.id).not.toBe(cancelled.pending!.id)
    expect(late).toBe(next)
  })

  it('ignores a result or failure for a different request', () => {
    const pending = press('2 + 3 =')
    const staleId = pending.pending!.id - 1

    expect(calculatorReducer(pending, { type: 'resolved', id: staleId, result: 99, durationMs: 0 })).toBe(pending)
    expect(calculatorReducer(pending, { type: 'failed', id: staleId, message: 'old error' })).toBe(pending)
  })
})

describe('errors', () => {
  it('shows the message and keeps the operands so = retries', () => {
    const failed = fail(press('2 + 3 ='), 'Service unavailable')

    expect(failed.error).toBe('Service unavailable')
    expect(failed.pending).toBeNull()

    const retry = press('=', failed)
    expect(retry.error).toBeNull()
    expect(retry.pending).toMatchObject({ operation: 'add', a: 2, b: 3 })
    expect(retry.pending!.id).not.toBe(press('2 + 3 =').pending!.id)
  })

  it('lets the user correct the second operand after division by zero', () => {
    const failed = fail(press('8 / 0 ='), 'Cannot divide by zero')
    const corrected = press('2', failed)

    expect(corrected.error).toBeNull()
    expect(displayValue(corrected)).toBe('2')
    expect(press('=', corrected).pending).toMatchObject({ operation: 'divide', a: 8, b: 2 })
  })

  it('AC clears the error', () => {
    const cleared = press('AC', fail(press('8 / 0 ='), 'Cannot divide by zero'))

    expect(cleared.error).toBeNull()
    expect(displayValue(cleared)).toBe('0')
  })
})
