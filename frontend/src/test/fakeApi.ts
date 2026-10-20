import { vi } from 'vitest'

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit]
type Answer = Response | (() => Promise<Response>)

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/**
 * Replaces fetch with a fake calculator API that answers known requests from
 * a table keyed "operation a b" ("sqrt a" for the unary operation). Answers
 * are fixed, so tests never compute.
 */
export function stubApi(answers: Record<string, Answer>) {
  const fetchMock = vi.fn(async (_input: FetchArgs[0], init?: FetchArgs[1]) => {
    const { operation, a, b } = JSON.parse(init?.body as string)
    const key = b === undefined ? `${operation} ${a}` : `${operation} ${a} ${b}`
    const answer = answers[key]
    if (!answer) throw new Error(`unexpected request ${key}`)
    return typeof answer === 'function' ? answer() : answer
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function sentBodies(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string))
}

/** A response the test releases by calling resolve(), to observe the pending state. */
export function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { answer: () => promise, resolve }
}
