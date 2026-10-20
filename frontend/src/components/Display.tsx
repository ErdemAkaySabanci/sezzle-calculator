import type { CSSProperties } from 'react'
import { fitWidthEm } from '../calculator/format'
import { type CalculatorState, displayValue, expressionLine } from '../calculator/reducer'

interface DisplayProps {
  state: CalculatorState
}

export function Display({ state }: DisplayProps) {
  const value = displayValue(state)
  const expression = expressionLine(state)
  const { pending, queued, error, lastCalculation } = state

  return (
    <div className="display" data-testid="display" aria-busy={pending !== null} data-error={error ? '' : undefined}>
      <p
        className="display__expression"
        data-testid="display-expression"
        style={{ '--fit-em': Math.max(fitWidthEm(expression), 1) } as CSSProperties}
      >
        {expression}
      </p>
      <p
        // Remounting on each new result replays the short "settle" animation.
        key={lastCalculation ? `result-${state.requestCount}` : 'entry'}
        className={lastCalculation ? 'display__value display__value--result' : 'display__value'}
        data-testid="display-value"
        style={{ '--fit-em': fitWidthEm(value) } as CSSProperties}
      >
        {value}
      </p>
      <p className="display__status" role="status" data-tone={error ? 'error' : pending ? 'pending' : undefined}>
        {pending ? (
          `Calculating…${queued.length ? ` ${queued.length} ${queued.length === 1 ? 'key' : 'keys'} waiting` : ''}`
        ) : error ? (
          error
        ) : lastCalculation ? (
          <>
            <span className="visually-hidden">{`${expression} ${value}.`}</span>
            {/* Visible confirmation that the server did the work; too repetitive to announce. */}
            <span aria-hidden="true">Answered by the server in {lastCalculation.durationMs} ms</span>
          </>
        ) : null}
      </p>
    </div>
  )
}
