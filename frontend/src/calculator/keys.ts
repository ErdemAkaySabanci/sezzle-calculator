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
  /** Spans two columns (wide) or two rows (tall). */
  size?: 'wide' | 'tall'
}

const digit = (d: Digit): KeyDefinition => ({
  label: d,
  name: d,
  action: { type: 'digit', digit: d },
  variant: 'digit',
  keys: [d],
})

export const KEYPAD: KeyDefinition[] = [
  { label: 'AC', name: 'Clear', action: { type: 'clear' }, variant: 'function', keys: ['Escape', 'Delete'] },
  { label: '±', name: 'Toggle sign', action: { type: 'toggleSign' }, variant: 'function', keys: ['F9'] },
  { icon: 'backspace', name: 'Backspace', action: { type: 'backspace' }, variant: 'function', keys: ['Backspace'] },
  { label: '÷', name: 'Divide', action: { type: 'operator', operator: 'divide' }, variant: 'operator', keys: ['/'] },
  { label: 'xʸ', name: 'Power', action: { type: 'operator', operator: 'power' }, variant: 'function', keys: ['^'] },
  { label: '√', name: 'Square root', action: { type: 'sqrt' }, variant: 'function', keys: ['@'] },
  { label: '%', name: 'Percent of', action: { type: 'operator', operator: 'percentage' }, variant: 'function', keys: ['%'] },
  { label: '×', name: 'Multiply', action: { type: 'operator', operator: 'multiply' }, variant: 'operator', keys: ['*', 'x', 'X'] },
  digit('7'), digit('8'), digit('9'),
  { label: '−', name: 'Subtract', action: { type: 'operator', operator: 'subtract' }, variant: 'operator', keys: ['-'] },
  digit('4'), digit('5'), digit('6'),
  { label: '+', name: 'Add', action: { type: 'operator', operator: 'add' }, variant: 'operator', keys: ['+'] },
  digit('1'), digit('2'), digit('3'),
  { label: '=', name: 'Equals', action: { type: 'equals' }, variant: 'equals', keys: ['Enter', '='], size: 'tall' },
  { ...digit('0'), size: 'wide' },
  { label: '.', name: 'Decimal point', action: { type: 'decimal' }, variant: 'digit', keys: ['.', ','] },
]

interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  getModifierState?: (key: string) => boolean
}

/** The calculator action for a key press, or null to let the browser handle it. */
export function keyToAction(event: KeyLike): CalculatorAction | null {
  // Windows reports AltGr as Ctrl+Alt; it types characters (@ on Turkish and
  // German layouts), so it is not treated as a shortcut modifier.
  const altGraph = event.getModifierState?.('AltGraph') ?? false
  if (event.metaKey || (!altGraph && (event.ctrlKey || event.altKey))) return null
  return KEYPAD.find((key) => key.keys.includes(event.key))?.action ?? null
}
