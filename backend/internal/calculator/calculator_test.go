package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculateAdd(t *testing.T) {
	tests := []successCase{
		{"positive integers", 2, 3, 5},
		{"negative operand", -7, 2, -5},
		{"both negative", -1.5, -2.25, -3.75},
		{"decimals", 1.25, 2.5, 3.75},
		{"zero identity", 0, 42, 42},
		// Results are raw float64; rounding for display is the client's job.
		{"binary floating point is not rounded", 0.1, 0.2, 0.30000000000000004},
	}

	runSuccessCases(t, Add, tests)
}

func TestCalculateSubtract(t *testing.T) {
	runSuccessCases(t, Subtract, []successCase{
		{"positive result", 10, 4, 6},
		{"negative result", 4, 10, -6},
		{"subtract negative", 5, -3, 8},
		{"decimals", 5.5, 0.25, 5.25},
		{"operand order matters", 0, 7, -7},
	})
}

func TestCalculateMultiply(t *testing.T) {
	runSuccessCases(t, Multiply, []successCase{
		{"positive integers", 6, 7, 42},
		{"negative times positive", -3, 4, -12},
		{"negative times negative", -2.5, -4, 10},
		{"decimals", 1.5, 0.5, 0.75},
		{"by zero", 123.456, 0, 0},
	})
}

func TestCalculateDivide(t *testing.T) {
	runSuccessCases(t, Divide, []successCase{
		{"exact", 10, 4, 2.5},
		{"negative dividend", -9, 3, -3},
		{"negative divisor", 9, -3, -3},
		{"decimals", 0.75, 0.25, 3},
		{"operand order matters", 1, 8, 0.125},
		{"zero dividend", 0, 5, 0},
	})
}

func TestCalculateDivideByZero(t *testing.T) {
	tests := []struct {
		name string
		a, b float64
	}{
		{"positive dividend", 5, 0},
		{"negative dividend", -5, 0},
		{"zero dividend", 0, 0},
		{"negative zero divisor", 5, math.Copysign(0, -1)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(Divide, tt.a, tt.b)
			if !errors.Is(err, ErrDivisionByZero) {
				t.Fatalf("Calculate(divide, %v, %v) error = %v, want ErrDivisionByZero (result %v)", tt.a, tt.b, err, got)
			}
		})
	}
}

func TestCalculateUnknownOperation(t *testing.T) {
	for _, op := range []Operation{"", "modulo", "ADD", " add"} {
		t.Run(string(op), func(t *testing.T) {
			_, err := Calculate(op, 1, 2)
			if !errors.Is(err, ErrUnknownOperation) {
				t.Fatalf("Calculate(%q, 1, 2) error = %v, want ErrUnknownOperation", op, err)
			}
		})
	}
}

// The HTTP layer cannot produce NaN or ±Inf (JSON has no such literals), but
// the package must not quietly turn them into finite answers such as 1/Inf = 0.
func TestCalculateRejectsNonFiniteOperands(t *testing.T) {
	tests := []struct {
		name string
		a, b float64
	}{
		{"NaN a", math.NaN(), 1},
		{"NaN b", 1, math.NaN()},
		{"+Inf a", math.Inf(1), 1},
		{"-Inf b", 1, math.Inf(-1)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Calculate(Divide, tt.a, tt.b)
			if !errors.Is(err, ErrInvalidOperand) {
				t.Fatalf("Calculate(divide, %v, %v) error = %v, want ErrInvalidOperand", tt.a, tt.b, err)
			}
		})
	}
}

func TestCalculateNonFiniteResult(t *testing.T) {
	tests := []struct {
		name string
		op   Operation
		a, b float64
	}{
		{"add overflows to +Inf", Add, math.MaxFloat64, math.MaxFloat64},
		{"subtract overflows to -Inf", Subtract, -math.MaxFloat64, math.MaxFloat64},
		{"multiply overflows to +Inf", Multiply, 1e308, 10},
		{"multiply overflows to -Inf", Multiply, -1e308, 10},
		{"divide overflows to +Inf", Divide, 1e308, 1e-308},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.a, tt.b)
			if !errors.Is(err, ErrNonFiniteResult) {
				t.Fatalf("Calculate(%s, %v, %v) = %v, %v; want ErrNonFiniteResult", tt.op, tt.a, tt.b, got, err)
			}
		})
	}
}

// IEEE-754 produces -0 for cases like -1 * 0; it is meaningless to users and
// would serialise as "-0", so results are normalised to +0.
func TestCalculateNormalizesNegativeZero(t *testing.T) {
	negZero := math.Copysign(0, -1)
	tests := []struct {
		name string
		op   Operation
		a, b float64
	}{
		{"negative times zero", Multiply, -1, 0},
		{"zero divided by negative", Divide, 0, -5},
		{"negative zero plus negative zero", Add, negZero, negZero},
		{"negative zero minus zero", Subtract, negZero, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.a, tt.b)
			if err != nil {
				t.Fatalf("Calculate(%s, %v, %v) returned error: %v", tt.op, tt.a, tt.b, err)
			}
			if got != 0 || math.Signbit(got) {
				t.Errorf("Calculate(%s, %v, %v) = %v (signbit %t), want +0", tt.op, tt.a, tt.b, got, math.Signbit(got))
			}
		})
	}
}

type successCase struct {
	name string
	a, b float64
	want float64
}

func runSuccessCases(t *testing.T, op Operation, tests []successCase) {
	t.Helper()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(op, tt.a, tt.b)
			if err != nil {
				t.Fatalf("Calculate(%s, %v, %v) returned error: %v", op, tt.a, tt.b, err)
			}
			if got != tt.want {
				t.Errorf("Calculate(%s, %v, %v) = %v, want %v", op, tt.a, tt.b, got, tt.want)
			}
		})
	}
}
