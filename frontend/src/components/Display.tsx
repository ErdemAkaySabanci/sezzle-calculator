import type { CSSProperties } from 'react'
import { fitWidthEm } from '../calculator/format'
import { type CalculatorState, displayValue, expressionLine, pendingMessage } from '../calculator/reducer'

interface DisplayProps {
  state: CalculatorState
}

export function Display({ state }: DisplayProps) {
  const value = displayValue(state)
  const expression = expressionLine(state)
  const { pending, error, lastCalculation } = state

  return (
    <div
      className="display"
      data-testid="display"
      data-error={error ? '' : undefined}
      // A result the API has just confirmed; cleared by the next input.
      data-confirmed={lastCalculation && !pending && !error ? '' : undefined}
      style={{ '--value-fit-em': fitWidthEm(value) } as CSSProperties}
    >
      <p
        className="display__expression"
        data-testid="display-expression"
        style={{ '--fit-em': Math.max(fitWidthEm(expression), 1) } as CSSProperties}
      >
        {expression}
      </p>
      {/* aria-busy marks the figure, not an ancestor of the live region below,
          which some screen readers would otherwise keep silent while busy. */}
      <p
        className="display__value"
        data-testid="display-value"
        aria-busy={pending !== null}
        style={{ '--fit-em': fitWidthEm(value) } as CSSProperties}
      >
        {value}
      </p>
      {/* The live region for assistive technology. Only errors are shown here;
          progress and response time are shown by the API status in the corner. */}
      <p className="display__status" role="status" data-tone={error ? 'error' : pending ? 'pending' : undefined}>
        {pending ? (
          <span className="visually-hidden">{pendingMessage(state)}</span>
        ) : error ? (
          error
        ) : lastCalculation ? (
          <span className="visually-hidden">{`${expression} ${value}.`}</span>
        ) : null}
      </p>
    </div>
  )
}
