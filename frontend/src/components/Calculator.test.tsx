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
const apiStatus = () => screen.getByTestId('api-status')

describe('Calculator', () => {
  it('shows an API status that starts as not yet contacted, without sending any request', () => {
    const fetchMock = stubApi({})
    setup()

    expect(apiStatus()).toHaveTextContent(/^Go API$/)
    expect(apiStatus()).toHaveAttribute('data-state', 'unknown')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is titled by a visible level-one heading', () => {
    setup()

    const heading = screen.getByRole('heading', { level: 1, name: 'Calculator' })
    expect(heading).not.toHaveClass('visually-hidden')
  })

  it('calculates with the mouse, using the API for the result', async () => {
    const fetchMock = stubApi({ 'multiply 12 3': jsonResponse({ result: 36 }) })
    const { click } = setup()

    await click('1', '2', 'Multiply', '3', 'Equals')

    await waitFor(() => expect(value()).toBe('36'))
    expect(expression()).toBe('12\u00a0× 3\u00a0=')
    expect(sentBodies(fetchMock)).toEqual([{ operation: 'multiply', a: 12, b: 3 }])
    expect(apiStatus()).toHaveTextContent(/^Go API \d+ ms$/)
    expect(apiStatus()).toHaveAttribute('data-state', 'online')
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

  // Regression: found in browser QA. Keys typed before the first response
  // arrived were discarded, so a fast "2+3*4 Enter" showed 5.
  it('keeps keys typed while a calculation is in flight: fast 2 + 3 × 4 = 20', async () => {
    const first = deferredResponse()
    const fetchMock = stubApi({
      'add 2 3': first.answer,
      'multiply 5 4': jsonResponse({ result: 20 }),
    })
    const { user } = setup()

    await user.keyboard('2+3*4{Enter}')
    await act(async () => first.resolve(jsonResponse({ result: 5 })))

    await waitFor(() => expect(value()).toBe('20'))
    expect(sentBodies(fetchMock)).toEqual([
      { operation: 'add', a: 2, b: 3 },
      { operation: 'multiply', a: 5, b: 4 },
    ])
  })

  it('shows how many typed keys are waiting for the pending result', async () => {
    const first = deferredResponse()
    stubApi({ 'add 2 3': first.answer, 'multiply 5 4': jsonResponse({ result: 20 }) })
    const { user } = setup()

    await user.keyboard('2+3{Enter}')
    expect(status()).toHaveTextContent(/^Calculating…$/)

    await user.keyboard('*')
    expect(status()).toHaveTextContent('Calculating… 1 key waiting')
    expect(apiStatus()).toHaveTextContent('Calculating… 1 queued')
    expect(apiStatus()).toHaveAttribute('data-state', 'pending')
    await user.keyboard('4{Enter}')
    expect(status()).toHaveTextContent('Calculating… 3 keys waiting')

    await act(async () => first.resolve(jsonResponse({ result: 5 })))
    await waitFor(() => expect(value()).toBe('20'))
  })

  it('announces the calculation and shows the response time only in the API status', async () => {
    stubApi({ 'multiply 12 3': jsonResponse({ result: 36 }) })
    const { user } = setup()

    await user.keyboard('12*3{Enter}')

    await waitFor(() => expect(value()).toBe('36'))
    expect(status()).toHaveTextContent('12 × 3 = 36')
    expect(status()).not.toHaveTextContent(/\d+ ms/)
    expect(apiStatus()).not.toHaveAttribute('aria-live')
  })

  it('explains a division by zero and lets the user correct it', async () => {
    stubApi({
      'divide 8 0': jsonResponse({ error: { code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero' } }, 422),
      'divide 8 2': jsonResponse({ result: 4 }),
    })
    const { click } = setup()

    await click('8', 'Divide', '0', 'Equals')
    await waitFor(() => expect(status()).toHaveTextContent(/can't divide by zero/i))
    expect(apiStatus()).toHaveTextContent('Go API online')

    await click('2')
    expect(status()).not.toHaveTextContent(/divide by zero/i)

    await click('Equals')
    await waitFor(() => expect(value()).toBe('4'))
  })

  describe('power, square root and percentage', () => {
    it('calculates each with the mouse through the API', async () => {
      const fetchMock = stubApi({
        'power 2 10': jsonResponse({ result: 1024 }),
        'sqrt 1024': jsonResponse({ result: 32 }),
        'percentage 32 50': jsonResponse({ result: 16 }),
      })
      const { click } = setup()

      await click('2', 'Power', '1', '0', 'Equals')
      await waitFor(() => expect(value()).toBe('1,024'))
      expect(expression()).toBe('2 ^ 10 =')

      await click('Square root')
      await waitFor(() => expect(value()).toBe('32'))
      expect(expression()).toBe('√1,024 =')

      await click('Percent of', '5', '0', 'Equals')
      await waitFor(() => expect(value()).toBe('16'))
      expect(expression()).toBe('32% of 50 =')

      expect(sentBodies(fetchMock)).toEqual([
        { operation: 'power', a: 2, b: 10 },
        { operation: 'sqrt', a: 1024 },
        { operation: 'percentage', a: 32, b: 50 },
      ])
    })

    it('accepts ^, @ and % from the keyboard', async () => {
      const fetchMock = stubApi({
        'power 3 2': jsonResponse({ result: 9 }),
        'sqrt 9': jsonResponse({ result: 3 }),
        'percentage 20 150': jsonResponse({ result: 30 }),
      })
      const { user } = setup()

      await user.keyboard('3^2{Enter}')
      await waitFor(() => expect(value()).toBe('9'))
      await user.keyboard('@')
      await waitFor(() => expect(value()).toBe('3'))
      await user.keyboard('20%150{Enter}')
      await waitFor(() => expect(value()).toBe('30'))

      expect(sentBodies(fetchMock)).toEqual([
        { operation: 'power', a: 3, b: 2 },
        { operation: 'sqrt', a: 9 },
        { operation: 'percentage', a: 20, b: 150 },
      ])
      expect(status()).toHaveTextContent('20% of 150 = 30')
    })

    it('accepts @ typed with AltGr, which Windows reports as Ctrl+Alt', async () => {
      const fetchMock = stubApi({ 'sqrt 16': jsonResponse({ result: 4 }) })
      const { user } = setup()

      await user.keyboard('16')
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '@', ctrlKey: true, altKey: true, modifierAltGraph: true, bubbles: true }),
        )
      })

      await waitFor(() => expect(value()).toBe('4'))
      expect(sentBodies(fetchMock)).toEqual([{ operation: 'sqrt', a: 16 }])
    })

    it('takes a square root for the second number: 2 + √9 = 5', async () => {
      const fetchMock = stubApi({ 'sqrt 9': jsonResponse({ result: 3 }), 'add 2 3': jsonResponse({ result: 5 }) })
      const { click } = setup()

      await click('2', 'Add', '9', 'Square root')
      await waitFor(() => expect(value()).toBe('3'))
      expect(expression()).toBe('2 + √9')
      expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'false')

      await click('Equals')
      await waitFor(() => expect(value()).toBe('5'))
      expect(sentBodies(fetchMock)).toEqual([
        { operation: 'sqrt', a: 9 },
        { operation: 'add', a: 2, b: 3 },
      ])
    })

    it.each(['Power', 'Percent of'])('marks %s as the selected operator', async (name) => {
      const { click } = setup()

      await click('2', name)

      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
    })

    it('explains a square root of a negative number and lets the user correct it', async () => {
      stubApi({
        'sqrt -4': jsonResponse({ error: { code: 'DOMAIN_ERROR', message: 'no real result: square root of a negative number' } }, 422),
        'sqrt 4': jsonResponse({ result: 2 }),
      })
      const { click } = setup()

      await click('4', 'Toggle sign', 'Square root')
      await waitFor(() => expect(status()).toHaveTextContent("Can't take the square root of a negative number."))
      expect(apiStatus()).toHaveAttribute('data-state', 'online')

      await click('Toggle sign', 'Square root')
      await waitFor(() => expect(value()).toBe('2'))
      expect(status()).not.toHaveTextContent(/negative/)
    })

    it('explains a power with no real result', async () => {
      stubApi({
        'power 0 -1': jsonResponse({ error: { code: 'DOMAIN_ERROR', message: 'no real result: zero cannot be raised to a negative power' } }, 422),
      })
      const { click } = setup()

      await click('0', 'Power', '1', 'Toggle sign', 'Equals')

      await waitFor(() => expect(status()).toHaveTextContent('This power has no real-number result.'))
    })
  })

  it('explains when the calculator service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    const { click } = setup()

    await click('2', 'Add', '3', 'Equals')

    await waitFor(() => expect(status()).toHaveTextContent(/can't reach the calculator service/i))
    expect(apiStatus()).toHaveTextContent('Go API offline')
    expect(apiStatus()).toHaveAttribute('data-state', 'offline')
    expect(value()).toBe('3')
  })
})
