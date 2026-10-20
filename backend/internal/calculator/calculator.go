// Package calculator implements the arithmetic used by the calculator API.
// It has no knowledge of HTTP so it can be tested and reused in isolation.
package calculator

import (
	"errors"
	"math"
)

// Operation identifies an arithmetic operation.
type Operation string

// Supported operations.
const (
	Add      Operation = "add"
	Subtract Operation = "subtract"
	Multiply Operation = "multiply"
	Divide   Operation = "divide"
)

// Errors returned by Calculate. Callers should compare with errors.Is.
var (
	ErrUnknownOperation = errors.New("unknown operation")
	ErrInvalidOperand   = errors.New("operands must be finite numbers")
	ErrDivisionByZero   = errors.New("cannot divide by zero")
	ErrNonFiniteResult  = errors.New("result is too large to represent")
)

// Calculate applies op to a and b using IEEE-754 float64 arithmetic.
// Results are returned unrounded, except that -0 is normalised to 0.
// It fails if an operand or the result is NaN or ±Inf.
func Calculate(op Operation, a, b float64) (float64, error) {
	if !isFinite(a) || !isFinite(b) {
		return 0, ErrInvalidOperand
	}

	result, err := apply(op, a, b)
	if err != nil {
		return 0, err
	}
	if !isFinite(result) {
		return 0, ErrNonFiniteResult
	}
	if result == 0 {
		return 0, nil // drops the sign of -0
	}
	return result, nil
}

func apply(op Operation, a, b float64) (float64, error) {
	switch op {
	case Add:
		return a + b, nil
	case Subtract:
		return a - b, nil
	case Multiply:
		return a * b, nil
	case Divide:
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		return a / b, nil
	default:
		return 0, ErrUnknownOperation
	}
}

func isFinite(x float64) bool {
	return !math.IsNaN(x) && !math.IsInf(x, 0)
}
