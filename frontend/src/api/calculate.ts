// Client for the Go calculator API. All arithmetic happens on the server;
// this module only sends operands and interprets the response.

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide'

const DEFAULT_TIMEOUT_MS = 10_000

/** The API answered, but with an error (or with something we could not read). */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/** The request never produced a response. */
export class NetworkError extends Error {
  readonly reason: 'unreachable' | 'timeout'

  constructor(reason: 'unreachable' | 'timeout', options?: ErrorOptions) {
    super(reason === 'timeout' ? 'the calculator service timed out' : 'the calculator service is unreachable', options)
    this.name = 'NetworkError'
    this.reason = reason
  }
}

interface CalculateOptions {
  /** Aborting it rejects with the signal's AbortError, which callers can ignore. */
  signal?: AbortSignal
  timeoutMs?: number
}

export async function calculate(
  operation: Operation,
  a: number,
  b: number,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: CalculateOptions = {},
): Promise<number> {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new RangeError('operands must be finite numbers')
  }

  const timeout = AbortSignal.timeout(timeoutMs)
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, a, b }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new NetworkError(timeout.aborted ? 'timeout' : 'unreachable', { cause: error })
  }

  const body: unknown = await response.json().catch(() => undefined)
  if (response.ok && isRecord(body) && typeof body.result === 'number') {
    return body.result
  }
  if (!response.ok && isRecord(body) && isRecord(body.error)) {
    const { code, message } = body.error
    if (typeof code === 'string' && typeof message === 'string') {
      throw new ApiError(code, message, response.status)
    }
  }
  throw new ApiError('UNEXPECTED_RESPONSE', `unexpected response (HTTP ${response.status})`, response.status)
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
