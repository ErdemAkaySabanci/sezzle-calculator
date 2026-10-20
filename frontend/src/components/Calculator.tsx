import { useEffect } from 'react'
import { keyToAction } from '../calculator/keys'
import { useCalculator } from '../calculator/useCalculator'
import { Display } from './Display'
import { Keypad } from './Keypad'
import './Calculator.css'

export function Calculator() {
  const { state, dispatch } = useCalculator()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // A focused button already responds to Enter and Space; don't also run equals.
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) return
      const action = keyToAction(event)
      if (!action) return
      event.preventDefault()
      dispatch(action)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  // Highlight the operator while the calculator waits for the second number.
  const selectedOperator = state.replaceEntry && !state.pending ? state.operator : null

  return (
    <div className="calculator">
      <Display state={state} />
      <Keypad selectedOperator={selectedOperator} onPress={dispatch} />
    </div>
  )
}
