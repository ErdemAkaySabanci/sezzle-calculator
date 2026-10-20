// The keypad, in reading order, and the keyboard keys that press each button.
// Both the on-screen buttons and the keyboard handler read from this list.

import type { CalculatorAction, Digit } from './reducer'

export type KeyVariant = 'digit' | 'function' | 'operator' | 'equals'

export interface KeyDefinition {
  /** Visible text; omitted when the key shows an icon. */
  label?: string
  icon?: 'backspace'
  /** Accessible name, also used as the React key. */
  name: string
  action: CalculatorAction
  variant: KeyVariant
  /** KeyboardEvent.key values that press this key. */
  keys: string[]
  wide?: boolean
}

const digit = (d: Digit, wide = false): KeyDefinition => ({
  label: d,
  name: d,
  action: { type: 'digit', digit: d },
  variant: 'digit',
  keys: [d],
  wide,
})

export const KEYPAD: KeyDefinition[] = [
  { label: 'AC', name: 'Clear', action: { type: 'clear' }, variant: 'function', keys: ['Escape', 'Delete'] },
  { label: '±', name: 'Toggle sign', action: { type: 'toggleSign' }, variant: 'function', keys: ['F9'] },
  { icon: 'backspace', name: 'Backspace', action: { type: 'backspace' }, variant: 'function', keys: ['Backspace'] },
  { label: '÷', name: 'Divide', action: { type: 'operator', operator: 'divide' }, variant: 'operator', keys: ['/'] },
  digit('7'), digit('8'), digit('9'),
  { label: '×', name: 'Multiply', action: { type: 'operator', operator: 'multiply' }, variant: 'operator', keys: ['*', 'x', 'X'] },
  digit('4'), digit('5'), digit('6'),
  { label: '−', name: 'Subtract', action: { type: 'operator', operator: 'subtract' }, variant: 'operator', keys: ['-'] },
  digit('1'), digit('2'), digit('3'),
  { label: '+', name: 'Add', action: { type: 'operator', operator: 'add' }, variant: 'operator', keys: ['+'] },
  digit('0', true),
  { label: '.', name: 'Decimal point', action: { type: 'decimal' }, variant: 'digit', keys: ['.', ','] },
  { label: '=', name: 'Equals', action: { type: 'equals' }, variant: 'equals', keys: ['Enter', '='] },
]

interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

/** The calculator action for a key press, or null to let the browser handle it. */
export function keyToAction(event: KeyLike): CalculatorAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  return KEYPAD.find((key) => key.keys.includes(event.key))?.action ?? null
}
