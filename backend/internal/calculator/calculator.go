// Package calculator implements the arithmetic used by the calculator API.
// It has no knowledge of HTTP so it can be tested and reused in isolation.
package calculator

import (
	"errors"
	"fmt"
	"math"
)

// Operation identifies an arithmetic operation.
type Operation string

// Supported operations. Sqrt is unary and uses only a; the others are binary.
const (
	Add        Operation = "add"
	Subtract   Operation = "subtract"
	Multiply   Operation = "multiply"
	Divide     Operation = "divide"
	Power      Operation = "power"      // a raised to the power b
	Sqrt       Operation = "sqrt"       // square root of a
	Percentage Operation = "percentage" // a percent of b, e.g. 20 percent of 150 = 30
)

// Unary reports whether op takes a single operand (a).
func (op Operation) Unary() bool {
	return op == Sqrt
}

// Errors returned by Calculate. Callers should compare with errors.Is.
var (
	ErrUnknownOperation = errors.New("unknown operation")
	ErrInvalidOperand   = errors.New("operands must be finite numbers")
	ErrDivisionByZero   = errors.New("cannot divide by zero")
	ErrNonFiniteResult  = errors.New("result is too large to represent")
	// ErrDomain means the operation has no real-number result for these
	// operands. Returned errors wrap it with the specific reason.
	ErrDomain = errors.New("no real result")
)

// Calculate applies op to a and b using IEEE-754 float64 arithmetic.
// For unary operations b is ignored. Results are returned unrounded, except
// that -0 is normalised to 0. It fails if an operand or the result is NaN or ±Inf.
func Calculate(op Operation, a, b float64) (float64, error) {
	if !isFinite(a) || (!op.Unary() && !isFinite(b)) {
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
	case Power:
		return power(a, b)
	case Sqrt:
		if a < 0 {
			return 0, domainError("square root of a negative number")
		}
		return math.Sqrt(a), nil
	case Percentage:
		return percentage(a, b), nil
	default:
		return 0, ErrUnknownOperation
	}
}

func power(a, b float64) (float64, error) {
	// math.Pow returns ±Inf here, which would be misreported as an overflow.
	if a == 0 && b < 0 {
		return 0, domainError("zero cannot be raised to a negative power")
	}
	result := math.Pow(a, b)
	if math.IsNaN(result) {
		// With finite operands, Pow returns NaN only for a negative base and a
		// non-integer exponent: the result would be a complex number.
		return 0, domainError("negative base with a fractional exponent")
	}
	return result, nil
}

// percentage returns a percent of b. a*b/100 is exact for typical inputs
// (20*150/100), but a*b can overflow when the answer itself is representable,
// so that case falls back to a/100*b.
func percentage(a, b float64) float64 {
	if product := a * b; !math.IsInf(product, 0) {
		return product / 100
	}
	return a / 100 * b
}

func domainError(reason string) error {
	return fmt.Errorf("%w: %s", ErrDomain, reason)
}

func isFinite(x float64) bool {
	return !math.IsNaN(x) && !math.IsInf(x, 0)
}
