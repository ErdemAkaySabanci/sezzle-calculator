# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Sezzle engineers reviewing a take-home assignment. They use it as a real calculator (by mouse and by keyboard, on desktop and phone) to judge correctness, error handling, and finish. Their job is to try ordinary and hostile inputs quickly and see unambiguous results.

## Product Purpose

A four-function calculator (add, subtract, multiply, divide) whose arithmetic is performed entirely by a Go REST API. Success means every result is correct and clearly presented, every failure (division by zero, overflow, service unreachable) is explained in plain language, and the interface feels like a finished product rather than a demo.

## Positioning

The browser holds no calculation engine: each step is a call to `POST /api/calculate`, and the UI's job is faithful input, clear state, and honest feedback about that call.

## Operating Context

- Run locally: Go server on `localhost:8080`, Vite dev server on `localhost:5173` proxying `/api`.
- Reviewers inspect it in Chrome alongside the code, tests, and README.

## Capabilities and Constraints

- Immediate-execution keypad model: `2 + 3 × 4 =` evaluates left to right (20), one API call per step. There is no operator precedence.
- Decimal and negative input; at most 15 significant digits entered; results shown with up to 15 significant digits.
- Optional operations (power, square root, percentage) only after everything required is complete.
- React + TypeScript + Vite, plain CSS, minimal dependencies.
- The UI never computes results itself.

## Brand Commitments

Neutral, unbranded identity: fintech-inspired, but no Sezzle name, logo, or palette in the UI.

## Evidence on Hand

None. No customers, testimonials, or metrics exist, and none may be invented.

## Product Principles

1. Correctness over flourish: the displayed number is always the API's answer, rounded only for display.
2. Every state is visible: typing, waiting on the API, result, and error each look distinct.
3. Errors direct the user's next step; they never just state a mood.
4. Keyboard and pointer are equal citizens.

## Accessibility & Inclusion

WCAG 2.2 AA: AA contrast, full keyboard operation, visible focus, screen-reader announcements for results and errors, and `prefers-reduced-motion` respected.
