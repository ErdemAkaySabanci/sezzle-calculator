// Keypad state machine for an immediate-execution calculator.
//
// The reducer never does arithmetic. When a calculation is needed it records a
// `pending` request; useCalculator sends it to the API and dispatches the
// result back. Editing the typed entry (digits, decimal point, sign) is string
// manipulation only.

import type { BinaryOperation, UnaryOperation } from '../api/calculate'
import { formatEntry, formatResult } from './format'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** float64 reliably holds 15 significant decimal digits. */
const MAX_DIGITS = 15

const NBSP = '\u00a0'

/** An operation and its operands: b only for binary operations. */
export type Operands =
  | { operation: BinaryOperation; a: number; b: number }
  | { operation: UnaryOperation; a: number; b?: undefined }

export type PendingCalculation = Operands & {
  id: number
  /** Operator the user pressed to trigger this calculation, applied to its result. */
  then: BinaryOperation | null
}

export type CompletedCalculation = Operands & {
  result: number
  /** Round-trip time of the API call. */
  durationMs: number
}

export interface CalculatorState {
  /** The number being typed, or the last result, as a decimal string. */
  entry: string
  /** First operand, waiting for the second. */
  stored: number | null
  operator: BinaryOperation | null
  /** True after an operator or result: the next digit starts a new entry. */
  replaceEntry: boolean
  /**
   * True right after an operator: the entry still shows the first operand, so
   * = does nothing and another operator replaces this one. A square root taken
   * at that point becomes the second operand and clears it.
   */
  awaitingOperand: boolean
  pending: PendingCalculation | null
  /** Keys pressed while `pending` was in flight, applied in order once it resolves. */
  queued: CalculatorAction[]
  /** The calculation behind the displayed result, until the next input. */
  lastCalculation: CompletedCalculation | null
  error: string | null
  /** What the last response says about the API: no request yet, answering, or unreachable. */
  server: 'unknown' | 'online' | 'offline'
  /** Last request id issued. Never reset, so stale responses can be recognised. */
  requestCount: number
}

export type CalculatorAction =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'sqrt' }
  | { type: 'equals' }
  | { type: 'resolved'; id: number; result: number; durationMs: number }
  | { type: 'failed'; id: number; message: string; reachable: boolean }

export const initialState: CalculatorState = {
  entry: '0',
  stored: null,
  operator: null,
  replaceEntry: false,
  awaitingOperand: false,
  pending: null,
  queued: [],
  lastCalculation: null,
  error: null,
  server: 'unknown',
  requestCount: 0,
}

/**
 * What follows the first operand in the expression line. Each is joined to
 * that number with a non-breaking space, so a long line can only wrap before
 * the second number. Percentage is spelled out ("20% of 150"), so it cannot
 * be mistaken for a remainder.
 */
const OPERATOR_SUFFIXES: Record<BinaryOperation, string> = {
  add: `${NBSP}+`,
  subtract: `${NBSP}−`,
  multiply: `${NBSP}×`,
  divide: `${NBSP}÷`,
  power: `${NBSP}^`,
  percentage: `%${NBSP}of`,
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'clear':
      return { ...initialState, server: state.server, requestCount: state.requestCount }
    case 'resolved':
      if (state.pending?.id !== action.id) return state
      // Replay keys typed during the round trip; one of them may start the next request.
      return state.queued.reduce(
        calculatorReducer,
        applyResult(state, state.pending, action.result, action.durationMs),
      )
    case 'failed':
      // Operands and operator are kept, so pressing = (or the operator) retries.
      // Keys typed ahead assumed a result that never came, so they are dropped.
      return state.pending?.id === action.id
        ? { ...state, pending: null, queued: [], error: action.message, server: action.reachable ? 'online' : 'offline' }
        : state
  }

  if (state.pending) return { ...state, queued: [...state.queued, action] }
  const current = state.error || state.lastCalculation ? { ...state, error: null, lastCalculation: null } : state

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
    case 'sqrt':
      return request(current, { operation: 'sqrt', a: Number(current.entry) }, null)
    case 'equals':
      return current.operator !== null && current.stored !== null && !current.awaitingOperand
        ? request(current, { operation: current.operator, a: current.stored, b: Number(current.entry) }, null)
        : current
  }
}

/** "Calculating…", plus how many typed keys will apply when the result arrives. */
export function pendingMessage(state: CalculatorState): string {
  const count = state.queued.length
  return `Calculating…${count ? ` ${count} ${count === 1 ? 'key' : 'keys'} waiting` : ''}`
}

/** The text for the main display. */
export function displayValue(state: CalculatorState): string {
  return state.replaceEntry ? formatResult(Number(state.entry)) : formatEntry(state.entry)
}

/**
 * The calculation in progress, shown above the main display, e.g. "12 ×",
 * "2 + 3 =" or "√9 =". A square root taken for the second operand keeps the
 * first in view: "2 + √9".
 */
export function expressionLine(state: CalculatorState): string {
  const calculation = state.pending ?? state.lastCalculation
  const leading = state.operator !== null && state.stored !== null ? operatorPrefix(state.operator, state.stored) : ''
  if (!calculation) return leading
  if (calculation.operation === 'sqrt') {
    const text = `√${formatResult(calculation.a)}`
    return leading ? `${leading} ${text}` : `${text}${NBSP}=`
  }
  const complete = state.pending ? state.pending.then === null : true
  return `${operatorPrefix(calculation.operation, calculation.a)} ${formatResult(calculation.b)}${complete ? `${NBSP}=` : ''}`
}

function operatorPrefix(operator: BinaryOperation, a: number): string {
  return `${formatResult(a)}${OPERATOR_SUFFIXES[operator]}`
}

function inputDigit(state: CalculatorState, digit: Digit): CalculatorState {
  if (state.replaceEntry) {
    return { ...state, entry: digit, replaceEntry: false, awaitingOperand: false }
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
    return { ...state, entry: '0.', replaceEntry: false, awaitingOperand: false }
  }
  return state.entry.includes('.') ? state : { ...state, entry: state.entry + '.' }
}

function toggleSign(state: CalculatorState): CalculatorState {
  if (state.awaitingOperand) {
    // Waiting for the second operand: start it as a negative number.
    return { ...state, entry: '-0', replaceEntry: false, awaitingOperand: false }
  }
  const entry = state.entry.startsWith('-') ? state.entry.slice(1) : '-' + state.entry
  return { ...state, entry }
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.replaceEntry) return state
  const entry = state.entry.slice(0, -1)
  return { ...state, entry: entry === '' || entry === '-' ? '0' : entry }
}

function inputOperator(state: CalculatorState, operator: BinaryOperation): CalculatorState {
  if (state.operator !== null && state.stored !== null) {
    return state.awaitingOperand
      ? { ...state, operator }
      : request(state, { operation: state.operator, a: state.stored, b: Number(state.entry) }, operator)
  }
  return { ...state, stored: Number(state.entry), operator, replaceEntry: true, awaitingOperand: true }
}

/** Records a calculation for useCalculator to send. */
function request(state: CalculatorState, operands: Operands, then: BinaryOperation | null): CalculatorState {
  const id = state.requestCount + 1
  return { ...state, requestCount: id, pending: { ...operands, id, then } }
}

function applyResult(
  state: CalculatorState,
  pending: PendingCalculation,
  result: number,
  durationMs: number,
): CalculatorState {
  const { then } = pending
  const settled = { ...state, entry: String(result), replaceEntry: true, pending: null, queued: [], server: 'online' as const }
  if (pending.operation === 'sqrt') {
    // The root replaces the entry; any calculation in progress carries on with it.
    const { operation, a } = pending
    return { ...settled, awaitingOperand: false, lastCalculation: { operation, a, result, durationMs } }
  }
  const { operation, a, b } = pending
  return {
    ...settled,
    stored: then === null ? null : result,
    operator: then,
    awaitingOperand: then !== null,
    // A chained step shows "5 ×" instead, so only a finished calculation is kept.
    lastCalculation: then === null ? { operation, a, b, result, durationMs } : null,
  }
}
