import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../api/calculate'
import { errorMessage, serverReachable } from './errorMessage'

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

  describe('DOMAIN_ERROR, explained for the operation that caused it', () => {
    const domainError = new ApiError('DOMAIN_ERROR', 'no real result: square root of a negative number', 422)

    it.each([
      ['sqrt', "Can't take the square root of a negative number. Use zero or a positive number."],
      ['power', 'This power has no real-number result. Change the base or the exponent.'],
      [undefined, 'These numbers have no real-number result. Try different numbers.'],
    ] as const)('%s', (operation, expected) => {
      expect(errorMessage(domainError, operation)).toBe(expected)
    })
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

describe('serverReachable', () => {
  it.each([
    ['an API error the server answered with (422)', true, new ApiError('DIVISION_BY_ZERO', 'cannot divide by zero', 422)],
    ['a validation error the server answered with (400)', true, new ApiError('INVALID_OPERAND', '"b" is required', 400)],
    ['an unreachable server', false, new NetworkError('unreachable')],
    ['a timeout', false, new NetworkError('timeout')],
    ['a server error (500)', false, new ApiError('INTERNAL_ERROR', 'internal server error', 500)],
    ['the dev proxy reporting the Go server is down (502, no JSON)', false, new ApiError('UNEXPECTED_RESPONSE', 'unexpected response (HTTP 502)', 502)],
  ])('%s: reachable %s', (_label, expected, error) => {
    expect(serverReachable(error)).toBe(expected)
  })
})
