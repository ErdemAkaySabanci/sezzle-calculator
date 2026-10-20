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
})

describe('KEYPAD', () => {
  it('has one key per action, each with a unique accessible name', () => {
    const names = KEYPAD.map((key) => key.name)

    expect(new Set(names).size).toBe(KEYPAD.length)
    expect(KEYPAD).toHaveLength(19)
  })
})
