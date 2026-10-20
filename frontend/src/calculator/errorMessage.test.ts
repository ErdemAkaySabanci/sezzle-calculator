import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../api/calculate'
import { errorMessage } from './errorMessage'

describe('errorMessage', () => {
  it.each([
    ['division by zero', new ApiError('DIVISION_BY_ZERO', 'cannot divide by zero', 422), /divide by zero/i],
    ['overflow', new ApiError('NON_FINITE_RESULT', 'result is too large to represent', 422), /too large/i],
    ['unreachable service', new NetworkError('unreachable'), /can't reach/i],
    ['timeout', new NetworkError('timeout'), /too long/i],
    ['server error', new ApiError('INTERNAL_ERROR', 'internal server error', 500), /unavailable/i],
    ['proxy error with no JSON body', new ApiError('UNEXPECTED_RESPONSE', 'unexpected response (HTTP 502)', 502), /unavailable/i],
  ])('explains %s', (_label, error, expected) => {
    expect(errorMessage(error)).toMatch(expected)
  })

  it.each([
    ['a validation error the UI should never trigger', new ApiError('INVALID_OPERAND', '"b" is required', 400)],
    ['an unexpected 200 response', new ApiError('UNEXPECTED_RESPONSE', 'unexpected response (HTTP 200)', 200)],
    ['an unknown error', new Error('boom')],
    ['a non-Error value', 'boom'],
  ])('falls back to a generic message for %s', (_label, error) => {
    expect(errorMessage(error)).toMatch(/something went wrong/i)
  })
})
