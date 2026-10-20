import { describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, calculate } from './calculate'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('calculate', () => {
  it('POSTs the operation and operands as JSON to /api/calculate', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 2.5 }))

    await calculate('divide', 10, 4)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/calculate')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init?.body as string)).toEqual({ operation: 'divide', a: 10, b: 4 })
  })

  it('returns the result from a successful response unchanged', async () => {
    stubFetch(async () => jsonResponse({ result: 0.30000000000000004 }))

    await expect(calculate('add', 0.1, 0.2)).resolves.toBe(0.30000000000000004)
  })

  it('prefixes requests with VITE_API_BASE_URL when it is set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://calc.example.com/')
    const fetchMock = stubFetch(async () => jsonResponse({ result: 3 }))

    await calculate('add', 1, 2)

    expect(fetchMock.mock.calls[0][0]).toBe('https://calc.example.com/api/calculate')
  })

  it('throws an ApiError carrying the code, message and status of an API error', async () => {
    stubFetch(async () =>
      jsonResponse({ error: { code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero' } }, 422),
    )

    const error = await calculate('divide', 1, 0).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero', status: 422 })
  })

  it('throws an UNEXPECTED_RESPONSE ApiError when an error response is not the JSON envelope', async () => {
    // The Vite dev proxy answers 502 with an empty body when the Go server is down.
    stubFetch(async () => new Response('', { status: 502 }))

    const error = await calculate('add', 1, 2).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'UNEXPECTED_RESPONSE', status: 502 })
  })

  it('throws an UNEXPECTED_RESPONSE ApiError when the error envelope has the wrong shape', async () => {
    stubFetch(async () => jsonResponse({ error: { code: 42, message: null } }, 400))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({ code: 'UNEXPECTED_RESPONSE', status: 400 })
  })

  it.each([
    ['a non-JSON body', new Response('<html>oops</html>', { status: 200 })],
    ['a missing result', jsonResponse({ value: 3 })],
    ['a non-numeric result', jsonResponse({ result: '3' })],
  ])('throws an UNEXPECTED_RESPONSE ApiError for a 200 with %s', async (_label, response) => {
    stubFetch(async () => response)

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({ code: 'UNEXPECTED_RESPONSE', status: 200 })
  })

  it('throws a NetworkError when the request cannot be sent', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    await expect(calculate('add', 1, 2)).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws a NetworkError with reason "timeout" when the server does not answer in time', async () => {
    stubFetch(neverRespond)

    const error = await calculate('add', 1, 2, { timeoutMs: 10 }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ reason: 'timeout' })
  })

  it('rethrows an AbortError, not a NetworkError, when the caller aborts', async () => {
    stubFetch(neverRespond)
    const controller = new AbortController()

    const pending = calculate('add', 1, 2, { signal: controller.signal })
    controller.abort()
    const error = await pending.catch((e: unknown) => e)

    expect(error).not.toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })

  // JSON.stringify turns NaN and ±Infinity into null, which the API would
  // report as a missing operand; refuse to send them at all.
  it.each([NaN, Infinity, -Infinity])('rejects the non-finite operand %s without calling the API', async (bad) => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 0 }))

    await expect(calculate('add', bad, 1)).rejects.toBeInstanceOf(RangeError)
    await expect(calculate('add', 1, bad)).rejects.toBeInstanceOf(RangeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['power', 2, 10],
    ['percentage', 20, 150],
  ] as const)('sends both operands for the binary operation %s', async (operation, a, b) => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 1 }))

    await calculate(operation, a, b)

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ operation, a, b })
  })

  it('omits b for sqrt, which the API rejects if b is present', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 3 }))

    await expect(calculate('sqrt', 9)).resolves.toBe(3)

    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"operation":"sqrt","a":9}')
  })

  it('rejects a b operand for sqrt without calling the API', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 0 }))

    await expect(calculate('sqrt', 9, 2)).rejects.toThrow(new RangeError('sqrt takes only operand a'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a binary operation without b without calling the API', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ result: 0 }))

    await expect(calculate('power', 2)).rejects.toThrow(new RangeError('power needs operands a and b'))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

/** A fetch that only settles when its signal aborts, like a hung server. */
function neverRespond(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
  })
}
