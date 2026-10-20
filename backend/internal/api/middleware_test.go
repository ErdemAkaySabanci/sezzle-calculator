package api

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRecoverPanicsReturnsJSON500(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	panicking := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})

	rec := httptest.NewRecorder()
	recoverPanics(logger, panicking).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	assertError(t, rec, http.StatusInternalServerError, "INTERNAL_ERROR")
	if !strings.Contains(logs.String(), "boom") {
		t.Errorf("panic value was not logged; logs: %s", logs.String())
	}
}

func TestRouterLogsRequestsWithStatus(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	req := httptest.NewRequest(http.MethodPost, "/api/calculate",
		strings.NewReader(`{"operation":"divide","a":1,"b":0}`))
	req.Header.Set("Content-Type", "application/json")

	NewRouter(logger).ServeHTTP(httptest.NewRecorder(), req)

	for _, want := range []string{"method=POST", "path=/api/calculate", "status=422"} {
		if !strings.Contains(logs.String(), want) {
			t.Errorf("log missing %q; logs: %s", want, logs.String())
		}
	}
}
