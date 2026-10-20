import { ApiError, NetworkError } from '../api/calculate'

/** Turns a failed calculation into a short message for the display. */
export function errorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.reason === 'timeout'
      ? 'The calculator service took too long to respond. Try again.'
      : "Can't reach the calculator service. Check it's running and try again."
  }
  if (error instanceof ApiError) {
    if (error.code === 'DIVISION_BY_ZERO') return "Can't divide by zero"
    if (error.code === 'NON_FINITE_RESULT') return 'Result is too large to calculate'
    if (error.status >= 500) return 'The calculator service is unavailable. Try again.'
  }
  // Validation errors mean the UI sent a request it should not have.
  return 'Something went wrong. Try again.'
}
