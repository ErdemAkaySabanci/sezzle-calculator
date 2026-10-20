import type { Operation } from '../api/calculate'
import { KEYPAD } from '../calculator/keys'
import type { CalculatorAction } from '../calculator/reducer'

interface KeypadProps {
  selectedOperator: Operation | null
  onPress: (action: CalculatorAction) => void
}

export function Keypad({ selectedOperator, onPress }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Keypad">
      {KEYPAD.map((key) => (
        <button
          key={key.name}
          type="button"
          className={`key key--${key.variant}${key.size ? ` key--${key.size}` : ''}`}
          aria-label={key.label === key.name ? undefined : key.name}
          aria-pressed={key.action.type === 'operator' ? key.action.operator === selectedOperator : undefined}
          onClick={(event) => {
            // A pointer click (detail > 0) would leave focus on the button in
            // Chrome and Edge, so a later Enter would press it again instead of
            // "=". Keyboard activation (detail 0) keeps focus for Tab users.
            if (event.detail > 0) event.currentTarget.blur()
            onPress(key.action)
          }}
        >
          {key.icon === 'backspace' ? <BackspaceIcon /> : key.label}
        </button>
      ))}
    </div>
  )
}

function BackspaceIcon() {
  return (
    <svg
      className="key__icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z" />
      <path d="m12.5 9.5 5 5m0-5-5 5" />
    </svg>
  )
}
