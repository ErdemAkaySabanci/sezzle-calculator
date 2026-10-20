import { describe, expect, it } from 'vitest'
import { KEYPAD, keyToAction } from './keys'

const plain = { ctrlKey: false, metaKey: false, altKey: false }

describe('keyToAction', () => {
  it.each([
    ['7', { type: 'digit', digit: '7' }],
    ['0', { type: 'digit', digit: '0' }],
    ['.', { type: 'decimal' }],
    [',', { type: 'decimal' }],
    ['+', { type: 'operator', operator: 'add' }],
    ['-', { type: 'operator', operator: 'subtract' }],
    ['*', { type: 'operator', operator: 'multiply' }],
    ['x', { type: 'operator', operator: 'multiply' }],
    ['/', { type: 'operator', operator: 'divide' }],
    ['Enter', { type: 'equals' }],
    ['=', { type: 'equals' }],
    ['Backspace', { type: 'backspace' }],
    ['Escape', { type: 'clear' }],
    ['Delete', { type: 'clear' }],
    ['F9', { type: 'toggleSign' }],
    ['^', { type: 'operator', operator: 'power' }],
    ['%', { type: 'operator', operator: 'percentage' }],
    ['@', { type: 'sqrt' }],
  ])('maps %s', (key, action) => {
    expect(keyToAction({ key, ...plain })).toEqual(action)
  })

  it.each(['a', 'Tab', ' ', 'ArrowLeft', 'F5'])('ignores %j', (key) => {
    expect(keyToAction({ key, ...plain })).toBeNull()
  })

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Alt', { altKey: true }],
  ])('leaves %s shortcuts to the browser', (_label, modifier) => {
    expect(keyToAction({ key: 'r', ...plain, ...modifier })).toBeNull()
    expect(keyToAction({ key: '1', ...plain, ...modifier })).toBeNull()
  })

  // Windows reports AltGr as Ctrl+Alt. On Turkish and German layouts @ is AltGr+Q.
  it('accepts characters typed with AltGr', () => {
    const altGr = { ...plain, ctrlKey: true, altKey: true, getModifierState: (key: string) => key === 'AltGraph' }

    expect(keyToAction({ key: '@', ...altGr })).toEqual({ type: 'sqrt' })
  })

  it('still ignores Ctrl+Alt when it is not AltGr', () => {
    const ctrlAlt = { ...plain, ctrlKey: true, altKey: true, getModifierState: () => false }

    expect(keyToAction({ key: '@', ...ctrlAlt })).toBeNull()
  })
})

describe('KEYPAD', () => {
  it('has one key per action, each with a unique accessible name', () => {
    const names = KEYPAD.map((key) => key.name)

    expect(new Set(names).size).toBe(KEYPAD.length)
    expect(KEYPAD).toHaveLength(22)
  })

  it('lists the keys in reading order, row by row', () => {
    expect(KEYPAD.map((key) => key.label ?? key.name)).toEqual([
      'AC', '±', 'Backspace', '÷',
      'xʸ', '√', '%', '×',
      '7', '8', '9', '−',
      '4', '5', '6', '+',
      '1', '2', '3', '=',
      '0', '.',
    ])
  })

  it.each([
    ['Power', 'xʸ', '^'],
    ['Square root', '√', '@'],
    ['Percent of', '%', '%'],
  ])('labels the %s key %s, pressed by %s', (name, label, shortcut) => {
    const key = KEYPAD.find((k) => k.name === name)

    expect(key).toMatchObject({ label, keys: [shortcut] })
  })

  it('makes = two rows tall and 0 two columns wide', () => {
    expect(KEYPAD.find((k) => k.name === 'Equals')?.size).toBe('tall')
    expect(KEYPAD.find((k) => k.name === '0')?.size).toBe('wide')
  })
})
