import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalculatorAction } from './reducer'
import { displayValue } from './reducer'
import { jsonResponse, sentBodies, stubApi } from '../test/fakeApi'
import { useCalculator } from './useCalculator'

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit]

function setup() {
  const hook = renderHook(() => useCalculator())
  const send = (...actions: CalculatorAction[]) => {
    for (const action of actions) act(() => hook.result.current.dispatch(action))
  }
  const state = () => hook.result.current.state
  return { send, state }
}

const two: CalculatorAction = { type: 'digit', digit: '2' }
const three: CalculatorAction = { type: 'digit', digit: '3' }
const four: CalculatorAction = { type: 'digit', digit: '4' }
const plus: CalculatorAction = { type: 'operator', operator: 'add' }
const times: CalculatorAction = { type: 'operator', operator: 'multiply' }
const divide: CalculatorAction = { type: 'operator', operator: 'divide' }
const equals: CalculatorAction = { type: 'equals' }

describe('useCalculator', () => {
  it('sends the calculation to the API and shows the result', async () => {
    const fetchMock = stubApi({ 'add 2 3': jsonResponse({ result: 5 }) })
    const { send, state } = setup()

    send(two, plus, three, equals)

    await waitFor(() => expect(displayValue(state())).toBe('5'))
    expect(sentBodies(fetchMock)).toEqual([{ operation: 'add', a: 2, b: 3 }])
    expect(state().pending).toBeNull()
  })

  it('records how long the API took to answer', async () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    stubApi({
      'add 2 3': async () => {
        now += 42 // the server "takes" 42 ms
        return jsonResponse({ result: 5 })
      },
    })
    const { send, state } = setup()

    send(two, plus, three, equals)

    await waitFor(() => expect(state().lastCalculation?.durationMs).toBe(42))
  })

  it('evaluates chained input one API call at a time: 2 + 3 × 4 = 20', async () => {
    const fetchMock = stubApi({
      'add 2 3': jsonResponse({ result: 5 }),
      'multiply 5 4': jsonResponse({ result: 20 }),
    })
    const { send, state } = setup()

    send(two, plus, three, times)
    await waitFor(() => expect(displayValue(state())).toBe('5'))
    send(four, equals)

    await waitFor(() => expect(displayValue(state())).toBe('20'))
    expect(sentBodies(fetchMock)).toEqual([
      { operation: 'add', a: 2, b: 3 },
      { operation: 'multiply', a: 5, b: 4 },
    ])
  })

  it('shows the API error message for a rejected calculation', async () => {
    stubApi({
      'divide 2 0': jsonResponse({ error: { code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero' } }, 422),
    })
    const { send, state } = setup()

    send(two, divide, { type: 'digit', digit: '0' }, equals)

    await waitFor(() => expect(state().error).toMatch(/divide by zero/i))
    expect(state().pending).toBeNull()
  })

  it('shows a connection message when the API cannot be reached', async () => {
    stubApi({
      'add 2 3': () => Promise.reject(new TypeError('Failed to fetch')),
    })
    const { send, state } = setup()

    send(two, plus, three, equals)

    await waitFor(() => expect(state().error).toMatch(/can't reach/i))
  })

  it('AC aborts the in-flight request and ignores its response', async () => {
    let respond!: (response: Response) => void
    let requestSignal: AbortSignal | null | undefined
    vi.stubGlobal('fetch', vi.fn((_input: FetchArgs[0], init?: FetchArgs[1]) => {
      requestSignal = init?.signal
      return new Promise<Response>((resolve) => { respond = resolve })
    }))
    const { send, state } = setup()

    send(two, plus, three, equals)
    await waitFor(() => expect(requestSignal).toBeDefined())
    send({ type: 'clear' })
    await act(async () => respond(jsonResponse({ result: 5 })))

    expect(requestSignal?.aborted).toBe(true)
    expect(displayValue(state())).toBe('0')
    expect(state().error).toBeNull()
  })
})
