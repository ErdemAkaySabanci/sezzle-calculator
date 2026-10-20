import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { deferredResponse, jsonResponse, sentBodies, stubApi } from '../test/fakeApi'
import { Calculator } from './Calculator'

function setup() {
  const user = userEvent.setup()
  render(<Calculator />)
  const click = async (...names: string[]) => {
    for (const name of names) await user.click(screen.getByRole('button', { name }))
  }
  return { user, click }
}

const value = () => screen.getByTestId('display-value').textContent
const expression = () => screen.getByTestId('display-expression').textContent
const status = () => screen.getByRole('status')

describe('Calculator', () => {
  it('calculates with the mouse, using the API for the result', async () => {
    const fetchMock = stubApi({ 'multiply 12 3': jsonResponse({ result: 36 }) })
    const { click } = setup()

    await click('1', '2', 'Multiply', '3', 'Equals')

    await waitFor(() => expect(value()).toBe('36'))
    expect(expression()).toBe('12 × 3 =')
    expect(sentBodies(fetchMock)).toEqual([{ operation: 'multiply', a: 12, b: 3 }])
    expect(status()).toHaveTextContent(/answered by the server in \d+ ms/i)
  })

  it('announces the completed calculation to screen readers', async () => {
    stubApi({ 'multiply 12 3': jsonResponse({ result: 36 }) })
    const { user } = setup()

    await user.keyboard('12*3{Enter}')

    await waitFor(() => expect(status()).toHaveTextContent('12 × 3 = 36'))
  })

  it('accepts keyboard input for digits, decimals, operators, and Enter', async () => {
    const fetchMock = stubApi({ 'divide 7.5 2': jsonResponse({ result: 3.75 }) })
    const { user } = setup()

    await user.keyboard('7.5/2{Enter}')

    await waitFor(() => expect(value()).toBe('3.75'))
    expect(sentBodies(fetchMock)).toEqual([{ operation: 'divide', a: 7.5, b: 2 }])
  })

  it('supports negative numbers with the sign key', async () => {
    const fetchMock = stubApi({ 'add -4 1.5': jsonResponse({ result: -2.5 }) })
    const { click } = setup()

    await click('4', 'Toggle sign', 'Add', '1', 'Decimal point', '5', 'Equals')

    await waitFor(() => expect(value()).toBe('-2.5'))
    expect(sentBodies(fetchMock)).toEqual([{ operation: 'add', a: -4, b: 1.5 }])
  })

  it('edits with Backspace and clears with Escape', async () => {
    const { user } = setup()

    await user.keyboard('123{Backspace}')
    expect(value()).toBe('12')

    await user.keyboard('{Escape}')
    expect(value()).toBe('0')
  })

  it('leaves keyboard shortcuts with modifiers to the browser', async () => {
    const { user } = setup()

    await user.keyboard('{Control>}1{/Control}{Meta>}2{/Meta}')

    expect(value()).toBe('0')
  })

  it('presses the focused key on Enter instead of also triggering equals', async () => {
    const fetchMock = stubApi({ 'add 2 35': jsonResponse({ result: 37 }) })
    const { user, click } = setup()

    await user.keyboard('2+3')
    act(() => screen.getByRole('button', { name: '5' }).focus())
    await user.keyboard('{Enter}')
    await click('Equals')

    await waitFor(() => expect(value()).toBe('37'))
    expect(sentBodies(fetchMock)).toEqual([{ operation: 'add', a: 2, b: 35 }])
  })

  it('marks the selected operator until the second number is typed', async () => {
    const { click } = setup()

    await click('2', 'Add')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Multiply' })).toHaveAttribute('aria-pressed', 'false')

    await click('3')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows that the API is working while a calculation is pending', async () => {
    const response = deferredResponse()
    stubApi({ 'add 2 3': response.answer })
    const { click } = setup()

    await click('2', 'Add', '3', 'Equals')

    expect(status()).toHaveTextContent(/calculating/i)
    expect(screen.getByTestId('display')).toHaveAttribute('aria-busy', 'true')

    await act(async () => response.resolve(jsonResponse({ result: 5 })))

    expect(value()).toBe('5')
    expect(screen.getByTestId('display')).toHaveAttribute('aria-busy', 'false')
  })

  it('explains a division by zero and lets the user correct it', async () => {
    stubApi({
      'divide 8 0': jsonResponse({ error: { code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero' } }, 422),
      'divide 8 2': jsonResponse({ result: 4 }),
    })
    const { click } = setup()

    await click('8', 'Divide', '0', 'Equals')
    await waitFor(() => expect(status()).toHaveTextContent(/can't divide by zero/i))

    await click('2')
    expect(status()).not.toHaveTextContent(/divide by zero/i)

    await click('Equals')
    await waitFor(() => expect(value()).toBe('4'))
  })

  it('explains when the calculator service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    const { click } = setup()

    await click('2', 'Add', '3', 'Equals')

    await waitFor(() => expect(status()).toHaveTextContent(/can't reach the calculator service/i))
    expect(value()).toBe('3')
  })
})
