import { Calculator } from './components/Calculator'

function App() {
  return (
    <main className="page">
      <Calculator />
      <p className="hint">
        Type to calculate: <span>
          <kbd>Enter</kbd> for =,
        </span>{' '}
        <span>
          <kbd>Esc</kbd> for AC,
        </span>{' '}
        <span>
          <kbd>F9</kbd> for ±
        </span>
      </p>
    </main>
  )
}

export default App
