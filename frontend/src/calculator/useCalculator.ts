import { useEffect, useReducer } from 'react'
import { calculate } from '../api/calculate'
import { errorMessage, serverReachable } from './errorMessage'
import { calculatorReducer, initialState } from './reducer'

/**
 * Calculator state plus the side effect the reducer cannot perform: whenever
 * a calculation becomes pending, send it to the API and dispatch the outcome.
 *
 * Cancelled requests (AC, unmount) are aborted to free the connection. Their
 * outcome may still be dispatched, but the reducer ignores any response whose
 * id no longer matches the pending calculation.
 */
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const { pending } = state

  useEffect(() => {
    if (!pending) return

    const controller = new AbortController()
    const startedAt = performance.now()
    calculate(pending.operation, pending.a, pending.b, { signal: controller.signal })
      .then((result) => {
        const durationMs = Math.round(performance.now() - startedAt)
        dispatch({ type: 'resolved', id: pending.id, result, durationMs })
      })
      .catch((error: unknown) =>
        dispatch({
          type: 'failed',
          id: pending.id,
          message: errorMessage(error, pending.operation),
          reachable: serverReachable(error),
        }),
      )
    return () => controller.abort()
  }, [pending])

  return { state, dispatch }
}
