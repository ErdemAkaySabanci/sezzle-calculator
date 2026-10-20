// Keypad state machine for an immediate-execution calculator.
//
// The reducer never does arithmetic. When a calculation is needed it records a
// `pending` request; useCalculator sends it to the API and dispatches the
// result back. Editing the typed entry (digits, decimal point, sign) is string
// manipulation only.

import type { Operation } from '../api/calculate'
import { formatEntry, formatResult } from './format'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** float64 reliably holds 15 significant decimal digits. */
const MAX_DIGITS = 15

export interface PendingCalculation {
  id: number
  operation: Operation
  a: number
  b: number
  /** Operator the user pressed to trigger this calculation, applied to its result. */
  then: Operation | null
}

export interface CalculatorState {
  /** The number being typed, or the last result, as a decimal string. */
  entry: string
  /** First operand, waiting for the second. */
  stored: number | null
  operator: Operation | null
  /** True after an operator or result: the next digit starts a new entry. */
  replaceEntry: boolean
  pending: PendingCalculation | null
  error: string | null
  /** Last request id issued. Never reset, so stale responses can be recognised. */
  requestCount: number
}

export type CalculatorAction =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; operator: Operation }
  | { type: 'equals' }
  | { type: 'resolved'; id: number; result: number }
  | { type: 'failed'; id: number; message: string }

export const initialState: CalculatorState = {
  entry: '0',
  stored: null,
  operator: null,
  replaceEntry: false,
  pending: null,
  error: null,
  requestCount: 0,
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'clear':
      return { ...initialState, requestCount: state.requestCount }
    case 'resolved':
      return state.pending?.id === action.id ? applyResult(state, state.pending, action.result) : state
    case 'failed':
      // Operands and operator are kept, so pressing = (or the operator) retries.
      return state.pending?.id === action.id ? { ...state, pending: null, error: action.message } : state
  }

  if (state.pending) return state
  const current = state.error ? { ...state, error: null } : state

  switch (action.type) {
    case 'digit':
      return inputDigit(current, action.digit)
    case 'decimal':
      return inputDecimal(current)
    case 'toggleSign':
      return toggleSign(current)
    case 'backspace':
      return backspace(current)
    case 'operator':
      return inputOperator(current, action.operator)
    case 'equals':
      return current.operator !== null && current.stored !== null && !current.replaceEntry
        ? request(current, current.operator, current.stored, null)
        : current
  }
}

/** The text for the main display. */
export function displayValue(state: CalculatorState): string {
  return state.replaceEntry ? formatResult(Number(state.entry)) : formatEntry(state.entry)
}

function inputDigit(state: CalculatorState, digit: Digit): CalculatorState {
  if (state.replaceEntry) {
    return { ...state, entry: digit, replaceEntry: false }
  }
  const sign = state.entry.startsWith('-') ? '-' : ''
  const body = state.entry.slice(sign.length)
  if (body === '0') {
    return { ...state, entry: sign + digit }
  }
  if (body.replace('.', '').length >= MAX_DIGITS) {
    return state
  }
  return { ...state, entry: state.entry + digit }
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.replaceEntry) {
    return { ...state, entry: '0.', replaceEntry: false }
  }
  return state.entry.includes('.') ? state : { ...state, entry: state.entry + '.' }
}

function toggleSign(state: CalculatorState): CalculatorState {
  if (state.replaceEntry && state.operator !== null) {
    // Waiting for the second operand: start it as a negative number.
    return { ...state, entry: '-0', replaceEntry: false }
  }
  const entry = state.entry.startsWith('-') ? state.entry.slice(1) : '-' + state.entry
  return { ...state, entry }
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.replaceEntry) return state
  const entry = state.entry.slice(0, -1)
  return { ...state, entry: entry === '' || entry === '-' ? '0' : entry }
}

function inputOperator(state: CalculatorState, operator: Operation): CalculatorState {
  if (state.operator !== null && state.stored !== null) {
    return state.replaceEntry
      ? { ...state, operator }
      : request(state, state.operator, state.stored, operator)
  }
  return { ...state, stored: Number(state.entry), operator, replaceEntry: true }
}

function request(state: CalculatorState, operation: Operation, a: number, then: Operation | null): CalculatorState {
  const id = state.requestCount + 1
  return {
    ...state,
    requestCount: id,
    pending: { id, operation, a, b: Number(state.entry), then },
  }
}

function applyResult(state: CalculatorState, pending: PendingCalculation, result: number): CalculatorState {
  return {
    ...state,
    entry: String(result),
    stored: pending.then === null ? null : result,
    operator: pending.then,
    replaceEntry: true,
    pending: null,
  }
}
