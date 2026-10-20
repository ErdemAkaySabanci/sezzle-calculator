import { Calculator } from './components/Calculator'

function App() {
  return (
    <main className="page">
      <h1 className="visually-hidden">Calculator</h1>
      <Calculator />
      <p className="hint">
        Works with your keyboard: <kbd>Enter</kbd> for =, <kbd>Backspace</kbd> to delete, <kbd>Esc</kbd> to clear,{' '}
        <kbd>F9</kbd> to change sign.
      </p>
    </main>
  )
}

export default App
