import type { CSSProperties } from 'react'
import { type CalculatorState, displayValue, expressionLine } from '../calculator/reducer'

interface DisplayProps {
  state: CalculatorState
}

export function Display({ state }: DisplayProps) {
  const value = displayValue(state)
  const expression = expressionLine(state)
  const { pending, error, lastCalculation } = state

  return (
    <div className="display" data-testid="display" aria-busy={pending !== null}>
      <p className="display__expression" data-testid="display-expression">
        {expression}
      </p>
      <p
        // Remounting on each new result replays the short "settle" animation.
        key={lastCalculation ? `result-${state.requestCount}` : 'entry'}
        className={lastCalculation ? 'display__value display__value--result' : 'display__value'}
        data-testid="display-value"
        style={{ '--chars': value.length } as CSSProperties}
      >
        {value}
      </p>
      <p className="display__status" role="status" data-tone={error ? 'error' : pending ? 'pending' : undefined}>
        {pending ? (
          'Calculating…'
        ) : error ? (
          error
        ) : lastCalculation ? (
          <>
            <span className="visually-hidden">{`${expression} ${value}. `}</span>
            Answered by the server in {lastCalculation.durationMs} ms
          </>
        ) : null}
      </p>
    </div>
  )
}
