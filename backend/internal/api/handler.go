// Package api exposes the calculator over HTTP. It owns request decoding,
// validation and error mapping; the arithmetic lives in package calculator.
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strings"

	"sezzle-calculator/backend/internal/calculator"
)

// maxBodyBytes bounds request bodies; a valid request is well under 200 bytes.
const maxBodyBytes = 1 << 10

// NewRouter returns the HTTP handler for the calculator service.
//
// Each route is registered twice: once with its method and once without. The
// method-less pattern only matches other methods, which lets us answer them
// with a JSON 405 instead of net/http's plain-text default. The same applies
// to "/", which catches unknown routes.
func NewRouter(logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/calculate", handleCalculate)
	mux.HandleFunc("/api/calculate", methodNotAllowed("POST"))
	mux.HandleFunc("GET /api/health", handleHealth)
	mux.HandleFunc("/api/health", methodNotAllowed("GET, HEAD"))
	mux.HandleFunc("/", handleNotFound)
	return logRequests(logger, recoverPanics(logger, mux))
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleNotFound(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotFound, "NOT_FOUND", "route not found")
}

func methodNotAllowed(allow string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", allow)
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED",
			fmt.Sprintf("method %s is not allowed; use %s", r.Method, allow))
	}
}

// calculateRequest uses pointers for the operands so that a missing or null
// operand is rejected instead of silently decoding as 0. A unary operation
// (sqrt) must omit b; a null b counts as omitted.
type calculateRequest struct {
	Operation string   `json:"operation"`
	A         *float64 `json:"a"`
	B         *float64 `json:"b"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

// requestError is a client error detected while reading the request.
type requestError struct {
	status  int
	code    string
	message string
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	req, reqErr := decodeCalculateRequest(w, r)
	if reqErr != nil {
		writeError(w, reqErr.status, reqErr.code, reqErr.message)
		return
	}

	var b float64 // stays 0 for unary operations, which ignore it
	if req.B != nil {
		b = *req.B
	}
	result, err := calculator.Calculate(calculator.Operation(req.Operation), *req.A, b)
	if err != nil {
		writeCalculationError(w, err, req.Operation)
		return
	}
	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

func decodeCalculateRequest(w http.ResponseWriter, r *http.Request) (calculateRequest, *requestError) {
	var req calculateRequest
	if mediaType, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mediaType != "application/json" {
		return req, &requestError{http.StatusUnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE",
			"Content-Type must be application/json"}
	}

	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	if err := dec.Decode(&req); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return req, &requestError{http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE",
				fmt.Sprintf("request body must not exceed %d bytes", maxBodyBytes)}
		}
		return req, invalidJSON(jsonErrorMessage(err))
	}
	// A second Decode must hit EOF; anything else is trailing data.
	if dec.Decode(&struct{}{}) != io.EOF {
		return req, invalidJSON("request body must contain a single JSON object")
	}

	switch {
	case req.Operation == "":
		return req, &requestError{http.StatusBadRequest, "INVALID_OPERATION", `"operation" is required`}
	case req.A == nil:
		return req, missingOperand("a")
	case calculator.Operation(req.Operation).Unary() && req.B != nil:
		return req, &requestError{http.StatusBadRequest, "INVALID_OPERAND",
			fmt.Sprintf(`"b" must be omitted for %s, which uses only "a"`, req.Operation)}
	case !calculator.Operation(req.Operation).Unary() && req.B == nil:
		return req, missingOperand("b")
	}
	return req, nil
}

// jsonErrorMessage turns encoding/json errors into messages that describe the
// problem in terms of the request rather than Go types.
func jsonErrorMessage(err error) string {
	var typeErr *json.UnmarshalTypeError
	switch {
	case errors.Is(err, io.EOF):
		return "request body is required"
	case errors.As(err, &typeErr) && typeErr.Field == "":
		return "request body must be a JSON object"
	case errors.As(err, &typeErr):
		return fmt.Sprintf("invalid value for %q: expected a %s", typeErr.Field, jsonTypeName(typeErr.Field))
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		// encoding/json has no typed error for unknown fields.
		return "unknown field " + strings.TrimPrefix(err.Error(), "json: unknown field ")
	default:
		return "request body is not valid JSON"
	}
}

func jsonTypeName(field string) string {
	if field == "operation" {
		return "string"
	}
	return "finite number"
}

func invalidJSON(message string) *requestError {
	return &requestError{http.StatusBadRequest, "INVALID_JSON", message}
}

func missingOperand(name string) *requestError {
	return &requestError{http.StatusBadRequest, "INVALID_OPERAND", fmt.Sprintf("%q is required and must be a number", name)}
}

// writeCalculationError maps calculator errors to HTTP responses: 400 for an
// unsupported operation, 422 for well-formed requests with no finite real answer.
// calculator.ErrInvalidOperand cannot occur here because JSON cannot encode
// NaN or ±Inf, so it falls through to 500 like any other unexpected error.
func writeCalculationError(w http.ResponseWriter, err error, op string) {
	switch {
	case errors.Is(err, calculator.ErrUnknownOperation):
		writeError(w, http.StatusBadRequest, "INVALID_OPERATION",
			fmt.Sprintf("unsupported operation %q; use add, subtract, multiply, divide, power, sqrt or percentage", op))
	case errors.Is(err, calculator.ErrDivisionByZero):
		writeError(w, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO", err.Error())
	case errors.Is(err, calculator.ErrNonFiniteResult):
		writeError(w, http.StatusUnprocessableEntity, "NON_FINITE_RESULT", err.Error())
	case errors.Is(err, calculator.ErrDomain):
		writeError(w, http.StatusUnprocessableEntity, "DOMAIN_ERROR", err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
	}
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
