import { ApiError, NetworkError } from '../api/calculate'

/**
 * Whether a failed calculation still proves the server is up: it answered
 * with a 4xx error. Network failures, timeouts and 5xx responses (including
 * the dev proxy's 502 when the Go server is down) mean it is not reachable.
 */
export function serverReachable(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

/** Turns a failed calculation into a short message for the display. */
export function errorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.reason === 'timeout'
      ? 'The calculator service took too long to respond. Try again.'
      : "Can't reach the calculator service. Check it's running and try again."
  }
  if (error instanceof ApiError) {
    if (error.code === 'DIVISION_BY_ZERO') return "Can't divide by zero. Enter a different number."
    if (error.code === 'NON_FINITE_RESULT') return 'Result is too large to calculate. Try smaller numbers.'
    if (error.status >= 500) return 'The calculator service is unavailable. Try again.'
  }
  // Validation errors mean the UI sent a request it should not have.
  return 'Something went wrong. Try again.'
}
