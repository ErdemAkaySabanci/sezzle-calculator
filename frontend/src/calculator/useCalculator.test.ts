import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalculatorAction } from './reducer'
import { displayValue } from './reducer'
import { useCalculator } from './useCalculator'

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit]

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** A fake API that answers known requests from a table, keyed "operation a b". */
function stubApi(answers: Record<string, Response | (() => Promise<Response>)>) {
  const fetchMock = vi.fn(async (_input: FetchArgs[0], init?: FetchArgs[1]) => {
    const { operation, a, b } = JSON.parse(init?.body as string)
    const answer = answers[`${operation} ${a} ${b}`]
    if (!answer) throw new Error(`unexpected request ${operation} ${a} ${b}`)
    return typeof answer === 'function' ? answer() : answer
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentBodies(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string))
}

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
