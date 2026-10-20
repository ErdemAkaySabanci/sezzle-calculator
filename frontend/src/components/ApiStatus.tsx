import type { CalculatorState } from '../calculator/reducer'

interface ApiStatusProps {
  state: CalculatorState
}

/**
 * A quiet indicator of the Go API's state in the panel's corner. It is derived
 * only from requests the user makes: nothing polls the server. Not a live
 * region; the display's status line already announces results and errors.
 */
export function ApiStatus({ state }: ApiStatusProps) {
  const { pending, queued, server, lastCalculation } = state

  // Compact wording so the corner fits a 320px screen; the status line
  // announces the full "N keys waiting" sentence.
  let label = 'Go API'
  if (pending) label = `Calculating…${queued.length ? ` ${queued.length} queued` : ''}`
  else if (server === 'offline') label = 'Go API offline'
  else if (server === 'online') label = lastCalculation ? `Go API ${lastCalculation.durationMs} ms` : 'Go API online'

  return (
    <p className="api-status" data-testid="api-status" data-state={pending ? 'pending' : server}>
      <span className="api-status__dot" aria-hidden="true" />
      {label}
    </p>
  )
}
