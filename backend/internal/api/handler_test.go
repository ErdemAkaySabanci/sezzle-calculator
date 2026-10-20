package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"add", `{"operation":"add","a":2,"b":3}`, 5},
		{"subtract", `{"operation":"subtract","a":2,"b":3.5}`, -1.5},
		{"multiply", `{"operation":"multiply","a":-4,"b":2.5}`, -10},
		{"divide", `{"operation":"divide","a":10,"b":4}`, 2.5},
		{"power", `{"operation":"power","a":2,"b":10}`, 1024},
		{"sqrt without b", `{"operation":"sqrt","a":9}`, 3},
		{"sqrt with null b", `{"operation":"sqrt","a":2,"b":null}`, 1.4142135623730951},
		{"percentage is a percent of b", `{"operation":"percentage","a":20,"b":150}`, 30},
		{"field order does not matter", `{"b":4,"a":10,"operation":"divide"}`, 2.5},
		{"raw float64 result", `{"operation":"add","a":0.1,"b":0.2}`, 0.30000000000000004},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postCalculate(t, tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
			}
			assertJSONContentType(t, rec)
			var got struct {
				Result *float64 `json:"result"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("decode response %q: %v", rec.Body, err)
			}
			if got.Result == nil || *got.Result != tt.want {
				t.Errorf("result = %v, want %v (body %s)", got.Result, tt.want, rec.Body)
			}
		})
	}
}

// The response body is checked byte-for-byte because JSON would otherwise
// carry the sign: -1 * 0 is -0 in IEEE-754 and encoding/json writes "-0".
func TestCalculateNegativeZeroIsSerialisedAsZero(t *testing.T) {
	rec := postCalculate(t, `{"operation":"multiply","a":-1,"b":0}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
	}
	if got := rec.Body.String(); got != "{\"result\":0}\n" {
		t.Errorf("body = %q, want %q", got, "{\"result\":0}\n")
	}
}

func TestCalculateDomainErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"divide by zero", `{"operation":"divide","a":5,"b":0}`, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"},
		{"zero divided by zero", `{"operation":"divide","a":0,"b":0}`, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"},
		{"multiply overflow", `{"operation":"multiply","a":1e308,"b":10}`, http.StatusUnprocessableEntity, "NON_FINITE_RESULT"},
		{"add overflow", `{"operation":"add","a":1.7976931348623157e308,"b":1.7976931348623157e308}`, http.StatusUnprocessableEntity, "NON_FINITE_RESULT"},
		{"power overflow", `{"operation":"power","a":10,"b":400}`, http.StatusUnprocessableEntity, "NON_FINITE_RESULT"},
		{"percentage overflow", `{"operation":"percentage","a":1e308,"b":1e308}`, http.StatusUnprocessableEntity, "NON_FINITE_RESULT"},
		{"square root of a negative number", `{"operation":"sqrt","a":-4}`, http.StatusUnprocessableEntity, "DOMAIN_ERROR"},
		{"zero to a negative power", `{"operation":"power","a":0,"b":-1}`, http.StatusUnprocessableEntity, "DOMAIN_ERROR"},
		{"negative base, fractional exponent", `{"operation":"power","a":-8,"b":0.5}`, http.StatusUnprocessableEntity, "DOMAIN_ERROR"},
		{"unknown operation", `{"operation":"modulo","a":5,"b":2}`, http.StatusBadRequest, "INVALID_OPERATION"},
		{"operation is case-sensitive", `{"operation":"ADD","a":5,"b":2}`, http.StatusBadRequest, "INVALID_OPERATION"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postCalculate(t, tt.body)
			assertError(t, rec, tt.wantStatus, tt.wantCode)
		})
	}
}

// The message names the reason, so API clients need not guess which rule failed.
func TestCalculateDomainErrorMessage(t *testing.T) {
	rec := postCalculate(t, `{"operation":"sqrt","a":-4}`)
	msg := assertError(t, rec, http.StatusUnprocessableEntity, "DOMAIN_ERROR")
	if want := "no real result: square root of a negative number"; msg != want {
		t.Errorf("error.message = %q, want %q", msg, want)
	}
}

func TestCalculateRejectsInvalidRequestBodies(t *testing.T) {
	tests := []struct {
		name            string
		body            string
		wantCode        string
		wantMsgContains string
	}{
		{"empty body", ``, "INVALID_JSON", ""},
		{"truncated JSON", `{"operation":"add","a":1`, "INVALID_JSON", ""},
		{"syntax error", `{operation: add}`, "INVALID_JSON", ""},
		{"NaN literal", `{"operation":"add","a":NaN,"b":1}`, "INVALID_JSON", ""},
		{"array instead of object", `[1,2]`, "INVALID_JSON", ""},
		{"operand as string", `{"operation":"add","a":"1","b":2}`, "INVALID_JSON", `"a"`},
		{"operation as number", `{"operation":1,"a":1,"b":2}`, "INVALID_JSON", `"operation"`},
		{"operand out of float64 range", `{"operation":"add","a":1e400,"b":1}`, "INVALID_JSON", `"a"`},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, "INVALID_JSON", `"c"`},
		{"second JSON value", `{"operation":"add","a":1,"b":2}{"a":3}`, "INVALID_JSON", ""},
		{"trailing garbage", `{"operation":"add","a":1,"b":2} x`, "INVALID_JSON", ""},

		{"missing operation", `{"a":1,"b":2}`, "INVALID_OPERATION", "required"},
		{"empty operation", `{"operation":"","a":1,"b":2}`, "INVALID_OPERATION", "required"},
		{"null operation", `{"operation":null,"a":1,"b":2}`, "INVALID_OPERATION", "required"},
		{"JSON null body", `null`, "INVALID_OPERATION", "required"},

		{"missing a", `{"operation":"add","b":2}`, "INVALID_OPERAND", `"a"`},
		{"missing b", `{"operation":"add","a":1}`, "INVALID_OPERAND", `"b"`},
		{"null a", `{"operation":"add","a":null,"b":2}`, "INVALID_OPERAND", `"a"`},
		{"null b with zero a", `{"operation":"divide","a":0,"b":null}`, "INVALID_OPERAND", `"b"`},
		{"missing b for power", `{"operation":"power","a":2}`, "INVALID_OPERAND", `"b"`},
		{"missing b for percentage", `{"operation":"percentage","a":20}`, "INVALID_OPERAND", `"b"`},
		{"b sent for sqrt", `{"operation":"sqrt","a":9,"b":2}`, "INVALID_OPERAND", `"b" must be omitted for sqrt`},
		{"missing a for sqrt", `{"operation":"sqrt"}`, "INVALID_OPERAND", `"a"`},
		{"unknown operation lists the supported ones", `{"operation":"modulo","a":5,"b":2}`, "INVALID_OPERATION",
			"add, subtract, multiply, divide, power, sqrt or percentage"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postCalculate(t, tt.body)
			msg := assertError(t, rec, http.StatusBadRequest, tt.wantCode)
			if !strings.Contains(msg, tt.wantMsgContains) {
				t.Errorf("error.message = %q, want it to mention %s", msg, tt.wantMsgContains)
			}
		})
	}
}

func TestCalculateContentType(t *testing.T) {
	tests := []struct {
		name        string
		contentType string
		wantStatus  int
	}{
		{"missing", "", http.StatusUnsupportedMediaType},
		{"form encoded", "application/x-www-form-urlencoded", http.StatusUnsupportedMediaType},
		{"text", "text/plain", http.StatusUnsupportedMediaType},
		{"json with charset", "application/json; charset=utf-8", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/calculate",
				strings.NewReader(`{"operation":"add","a":1,"b":2}`))
			if tt.contentType != "" {
				req.Header.Set("Content-Type", tt.contentType)
			}
			rec := serve(req)

			if tt.wantStatus == http.StatusOK {
				if rec.Code != http.StatusOK {
					t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
				}
				return
			}
			assertError(t, rec, tt.wantStatus, "UNSUPPORTED_MEDIA_TYPE")
		})
	}
}

func TestCalculateRejectsOversizedBody(t *testing.T) {
	// Valid JSON padded with whitespace, so size is the only problem.
	body := `{"operation":"add","a":1` + strings.Repeat(" ", 2048) + `,"b":2}`
	rec := postCalculate(t, body)
	assertError(t, rec, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE")
}

func TestMethodNotAllowed(t *testing.T) {
	tests := []struct {
		method, path, wantAllow string
	}{
		{http.MethodGet, "/api/calculate", "POST"},
		{http.MethodPut, "/api/calculate", "POST"},
		{http.MethodDelete, "/api/calculate", "POST"},
		{http.MethodPost, "/api/health", "GET, HEAD"},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			rec := serve(httptest.NewRequest(tt.method, tt.path, nil))
			assertError(t, rec, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED")
			if got := rec.Header().Get("Allow"); got != tt.wantAllow {
				t.Errorf("Allow = %q, want %q", got, tt.wantAllow)
			}
		})
	}
}

func TestUnknownRouteReturnsJSON404(t *testing.T) {
	for _, path := range []string{"/", "/api", "/api/calculator", "/api/calculate/extra"} {
		t.Run(path, func(t *testing.T) {
			rec := serve(httptest.NewRequest(http.MethodGet, path, nil))
			assertError(t, rec, http.StatusNotFound, "NOT_FOUND")
		})
	}
}

func TestHealth(t *testing.T) {
	rec := serve(httptest.NewRequest(http.MethodGet, "/api/health", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	assertJSONContentType(t, rec)
	if got := rec.Body.String(); got != "{\"status\":\"ok\"}\n" {
		t.Errorf("body = %q, want {\"status\":\"ok\"}", got)
	}
}

// assertError checks the status and JSON error envelope and returns the message.
func assertError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantCode string) string {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d, want %d; body: %s", rec.Code, wantStatus, rec.Body)
	}
	assertJSONContentType(t, rec)
	var got struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode error response %q: %v", rec.Body, err)
	}
	if got.Error.Code != wantCode {
		t.Errorf("error.code = %q, want %q", got.Error.Code, wantCode)
	}
	if got.Error.Message == "" {
		t.Error("error.message is empty")
	}
	return got.Error.Message
}

func postCalculate(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/calculate", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return serve(req)
}

func serve(req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	NewRouter(discardLogger()).ServeHTTP(rec, req)
	return rec
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func assertJSONContentType(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
}
